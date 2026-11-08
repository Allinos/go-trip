'use strict';
/**
 * Partner onboarding state machine.
 *
 *   profile  -> category -> details -> documents -> payment (if category fee > 0) -> ACTIVE
 *
 * Nothing is "lost" if the partner leaves midway: the state is derived from stored data,
 * so on next login the app calls GET /partner/onboarding and resumes at `nextStep`.
 */
const prisma = require('../../lib/prisma');
const cache = require('../../lib/cache');
const settings = require('../../services/settings');
const notify = require('../../services/notify');
const { invalidateAuthCache } = require('../../middleware/auth');

const CATEGORIES_KEY = 'catalog:categories';

async function categories() {
  return cache.wrap(CATEGORIES_KEY, 300, () =>
    prisma.partnerCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, include: { requirements: { orderBy: { sortOrder: 'asc' } } } })
  );
}
const clearCategoryCache = () => cache.del(CATEGORIES_KEY);

async function categoryByCode(code) {
  return (await categories()).find((c) => c.code === code) || null;
}

async function categoryById(id) {
  const cached = (await categories()).find((c) => c.id === id);
  return cached || prisma.partnerCategory.findUnique({ where: { id }, include: { requirements: { orderBy: { sortOrder: 'asc' } } } });
}

const feeIsValid = (partner, category) => {
  if (!category.registrationFee) return true;
  if (!partner.feePaidAt) return false;
  return !partner.listingExpiresAt || partner.listingExpiresAt > new Date();
};

function driverDetailsComplete(profile) {
  return !!(profile && profile.licenseNumber && profile.vehicleTypes?.length && profile.district && (profile.hasPriorExperience ? profile.experienceYears >= 0 : true));
}

/** Profile completeness score (0-100) shown to the driver as a progress bar. */
function driverCompleteness(profile, user) {
  if (!profile) return 0;
  const checks = [
    !!user?.fullName,
    !!user?.photoKey,
    !!profile.headline,
    !!profile.bio,
    !!profile.licenseNumber,
    !!profile.licenseExpiry,
    profile.licenseTypes?.length > 0,
    profile.vehicleTypes?.length > 0,
    profile.languages?.length > 0,
    profile.serviceAreas?.length > 0,
    profile.workTypes?.length > 0,
    !!profile.availability,
    !!profile.district,
    profile.expectedPayMin != null,
    !profile.hasPriorExperience || !!profile.experienceDetails,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

async function loadFull(userId) {
  return prisma.partner.findUnique({
    where: { userId },
    include: { user: true, documents: true, driverProfile: true },
  });
}

/** Compute onboarding progress for the partner app. */
async function onboardingState(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const partner = await loadFull(userId);
  const steps = [];
  steps.push({ key: 'profile', label: 'Your name', done: !!user?.fullName });

  if (!partner) {
    steps.push({ key: 'category', label: 'Partner type', done: false });
    return { started: false, steps, nextStep: steps.find((s) => !s.done).key, accountStatus: null };
  }

  const category = await categoryById(partner.categoryId);
  steps.push({ key: 'category', label: 'Partner type', done: true });

  const detailsDone = !!(partner.district && partner.city) && (!category.hasDriverProfile || driverDetailsComplete(partner.driverProfile));
  steps.push({ key: 'details', label: category.hasDriverProfile ? 'Driver details' : 'Business details', done: detailsDone });

  const required = category.requirements.filter((r) => r.scope === 'partner' && r.isRequired);
  const byType = Object.fromEntries(partner.documents.map((d) => [d.docType, d]));
  const missing = required.filter((r) => !byType[r.docType] || byType[r.docType].status === 'rejected').map((r) => ({ docType: r.docType, label: r.label, rejected: byType[r.docType]?.status === 'rejected', reason: byType[r.docType]?.rejectionReason || null }));
  steps.push({ key: 'documents', label: 'Documents', done: missing.length === 0, missing });

  if (category.registrationFee > 0) {
    const valid = feeIsValid(partner, category);
    steps.push({
      key: 'payment',
      label: 'Registration fee',
      done: valid,
      amount: category.registrationFee,
      validityDays: category.feeValidityDays,
      expired: !!partner.feePaidAt && !valid,
    });
  }

  const pending = steps.find((s) => !s.done);
  // Once active, a rejected document or expired fee shows up as a pending step again, but the account stays active.
  return {
    started: true,
    partnerId: partner.id,
    category: { code: category.code, name: category.name, hasDriverProfile: category.hasDriverProfile, canListVehicles: category.canListVehicles, canCreateTrips: category.canCreateTrips, canListRentals: category.canListRentals, canViewGoodsOrders: category.canViewGoodsOrders, registrationFee: category.registrationFee },
    steps,
    nextStep: pending ? pending.key : 'done',
    completed: partner.accountStatus !== 'onboarding',
    accountStatus: partner.accountStatus,
    verificationStatus: partner.verificationStatus,
    rejectionReason: partner.rejectionReason,
    listing: category.hasDriverProfile ? { isListed: !!partner.driverProfile?.isListed, expiresAt: partner.listingExpiresAt } : null,
  };
}

/** Recompute DriverProfile.isListed (denormalised for fast marketplace queries). */
async function syncDriverListing(partnerId) {
  const partner = await prisma.partner.findUnique({ where: { id: partnerId }, include: { driverProfile: true, user: true } });
  if (!partner?.driverProfile) return false;
  const category = await categoryById(partner.categoryId);
  const needsApproval = await settings.get('driver_listing_requires_approval');
  const listed =
    category.hasDriverProfile &&
    partner.accountStatus === 'active' &&
    partner.user.status === 'active' &&
    partner.driverProfile.isAvailable &&
    feeIsValid(partner, category) &&
    !['rejected', 'suspended'].includes(partner.verificationStatus) &&
    (!needsApproval || partner.verificationStatus === 'approved');
  const completeness = driverCompleteness(partner.driverProfile, partner.user);
  if (listed !== partner.driverProfile.isListed || completeness !== partner.driverProfile.completeness) {
    await prisma.driverProfile.update({
      where: { partnerId },
      data: { isListed: listed, completeness, ...(listed && !partner.driverProfile.listedAt ? { listedAt: new Date() } : {}) },
    });
    await cache.delPrefix('mkt:');
  }
  return listed;
}

/** Activate the partner once every onboarding step is complete. Idempotent. */
async function tryComplete(userId) {
  const state = await onboardingState(userId);
  if (!state.started) return state;
  const allDone = state.steps.every((s) => s.done);
  if (allDone && state.accountStatus === 'onboarding') {
    const updated = await prisma.partner.updateMany({
      where: { id: state.partnerId, accountStatus: 'onboarding' },
      data: { accountStatus: 'active', activatedAt: new Date(), submittedAt: new Date(), verificationStatus: 'pending' },
    });
    if (updated.count === 1) {
      await invalidateAuthCache(userId);
      const listed = await syncDriverListing(state.partnerId);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      notify.registrationComplete({ id: state.partnerId }, user, listed);
    }
    return onboardingState(userId);
  }
  if (state.category?.hasDriverProfile) await syncDriverListing(state.partnerId);
  return state;
}

module.exports = { categories, categoryByCode, categoryById, clearCategoryCache, onboardingState, tryComplete, syncDriverListing, driverCompleteness, feeIsValid, loadFull };
