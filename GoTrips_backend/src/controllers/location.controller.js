const prisma = require('../config/database');
const { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound } = require('../utils/response.utils');
const { catchAsync } = require('../middleware/error.middleware');

/**
 * Get all districts and their major points
 * GET /api/locations
 * @access Public
 */
exports.getAllLocations = catchAsync(async (req, res) => {
  const { search, limit } = req.query;

  const where = {};
  
  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { major_points: { some: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const locations = await prisma.district.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      major_points: {
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      },
    },
    ...(limit && { take: parseInt(limit) }),
  });

  // Transform data to a cleaner format for the mobile app
  const formattedLocations = locations.map((loc) => ({
    districtId: loc.id.toString(),
    district: loc.name,
    points: loc.major_points.map((p) => ({
      pointId: p.id.toString(),
      name: p.name,
    })),
  }));

  sendSuccess(res, formattedLocations);
});

/**
 * Get single district with all points
 * GET /api/locations/:id
 * @access Public
 */
exports.getLocationById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const district = await prisma.district.findUnique({
    where: { districtId: BigInt(id) },
    select: {
      districtId: true,
      name: true,
      majorPoints: {
        select: {
          pointId: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!district) {
    return sendNotFound(res, 'District');
  }

  const formatted = {
    districtId: district.districtId.toString(),
    district: district.name,
    points: district.majorPoints.map((p) => ({
      pointId: p.pointId.toString(),
      name: p.name,
    })),
  };

  sendSuccess(res, formatted);
});

/**
 * Add a new district with major points
 * POST /api/locations
 * @access Private (Admin)
 */
exports.addLocation = catchAsync(async (req, res) => {
  const { name, points } = req.body;

  // Validation
  if (!name || !name.trim()) {
    return sendError(res, 'District name is required', 400, 'VALIDATION_ERROR');
  }

  if (!points || !Array.isArray(points) || points.length === 0) {
    return sendError(res, 'At least one major point is required', 400, 'VALIDATION_ERROR');
  }

  // Check for duplicate district name
  const existing = await prisma.district.findFirst({
    where: { name: { equals: name.trim(), mode: 'insensitive' } },
  });

  if (existing) {
    return sendError(res, `District "${name}" already exists`, 409, 'DUPLICATE_DISTRICT');
  }

  // Filter out empty point names
  const validPoints = points
    .map((p) => (typeof p === 'string' ? p.trim() : p))
    .filter((p) => p && p.length > 0);

  if (validPoints.length === 0) {
    return sendError(res, 'Valid point names are required', 400, 'VALIDATION_ERROR');
  }

  // Create district with points
  const newDistrict = await prisma.district.create({
    data: {
      name: name.trim(),
      major_points: {
        create: validPoints.map((p) => ({ name: p })),
      },
    },
    include: {
      major_points: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const formatted = {
    districtId: newDistrict.id,
    district: newDistrict.name,
    points: newDistrict.major_points.map((p) => ({
      id: p.id,
      name: p.name,
    })),
  };

  sendCreated(res, formatted, 'District added successfully');
});

/**
 * Update a district and its major points
 * PUT /api/locations/:id
 * @access Private (Admin)
 */
exports.updateLocation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, points } = req.body;

  // Validation
  if (!name || !name.trim()) {
    return sendError(res, 'District name is required', 400, 'VALIDATION_ERROR');
  }

  if (!points || !Array.isArray(points) || points.length === 0) {
    return sendError(res, 'At least one major point is required', 400, 'VALIDATION_ERROR');
  }

  // Check if district exists
  const existing = await prisma.district.findUnique({
    where: { districtId: BigInt(id) },
  });

  if (!existing) {
    return sendNotFound(res, 'District');
  }

  // Check for duplicate district name (excluding current district)
  const duplicate = await prisma.district.findFirst({
    where: {
      name: { equals: name.trim(), mode: 'insensitive' },
      NOT: { districtId: BigInt(id) },
    },
  });

  if (duplicate) {
    return sendError(res, `District "${name}" already exists`, 409, 'DUPLICATE_DISTRICT');
  }

  // Filter out empty point names
  const validPoints = points
    .map((p) => (typeof p === 'string' ? p.trim() : p))
    .filter((p) => p && p.length > 0);

  if (validPoints.length === 0) {
    return sendError(res, 'Valid point names are required', 400, 'VALIDATION_ERROR');
  }

  // Update district and replace all points
  const updatedDistrict = await prisma.district.update({
    where: { districtId: BigInt(id) },
    data: {
      name: name.trim(),
      majorPoints: {
        // Delete all existing points
        deleteMany: {},
        // Create new points
        create: validPoints.map((p) => ({ name: p })),
      },
    },
    include: {
      majorPoints: {
        select: {
          pointId: true,
          name: true,
        },
      },
    },
  });

  const formatted = {
    districtId: updatedDistrict.districtId.toString(),
    district: updatedDistrict.name,
    points: updatedDistrict.majorPoints.map((p) => ({
      pointId: p.pointId.toString(),
      name: p.name,
    })),
  };

  sendSuccess(res, formatted, 'District updated successfully');
});

/**
 * Delete a district and all its major points
 * DELETE /api/locations/:id
 * @access Private (Admin)
 */
exports.deleteLocation = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Check if district exists
  const existing = await prisma.district.findUnique({
    where: { districtId: BigInt(id) },
  });

  if (!existing) {
    return sendNotFound(res, 'District');
  }

  // Check if district is being used in any rides
  const ridesUsingDistrict = await prisma.ride.count({
    where: {
      OR: [
        { pickupAddress: { contains: existing.name, mode: 'insensitive' } },
        { dropAddress: { contains: existing.name, mode: 'insensitive' } },
      ],
    },
  });

  if (ridesUsingDistrict > 0) {
    return sendError(
      res,
      `Cannot delete district "${existing.name}" as it is being used in ${ridesUsingDistrict} ride(s)`,
      400,
      'DISTRICT_IN_USE'
    );
  }

  // Delete district (cascade deletes major points automatically)
  await prisma.district.delete({
    where: { districtId: BigInt(id) },
  });

  sendSuccess(res, null, `District "${existing.name}" and all associated points deleted successfully`);
});

/**
 * Add a major point to existing district
 * POST /api/locations/:id/points
 * @access Private (Admin)
 */
exports.addMajorPoint = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return sendError(res, 'Point name is required', 400, 'VALIDATION_ERROR');
  }

  // Check if district exists
  const district = await prisma.district.findUnique({
    where: { districtId: BigInt(id) },
  });

  if (!district) {
    return sendNotFound(res, 'District');
  }

  // Check if point already exists in this district
  const existingPoint = await prisma.majorPoint.findFirst({
    where: {
      districtId: BigInt(id),
      name: { equals: name.trim(), mode: 'insensitive' },
    },
  });

  if (existingPoint) {
    return sendError(res, `Point "${name}" already exists in this district`, 409, 'DUPLICATE_POINT');
  }

  // Add the point
  const newPoint = await prisma.majorPoint.create({
    data: {
      districtId: BigInt(id),
      name: name.trim(),
    },
  });

  const formatted = {
    pointId: newPoint.pointId.toString(),
    name: newPoint.name,
    districtId: newPoint.districtId.toString(),
  };

  sendCreated(res, formatted, 'Major point added successfully');
});

/**
 * Delete a major point
 * DELETE /api/locations/:districtId/points/:pointId
 * @access Private (Admin)
 */
exports.deleteMajorPoint = catchAsync(async (req, res) => {
  const { districtId, pointId } = req.params;

  // Check if point exists
  const point = await prisma.majorPoint.findUnique({
    where: { pointId: BigInt(pointId) },
  });

  if (!point) {
    return sendNotFound(res, 'Major point');
  }

  // Verify point belongs to the specified district
  if (point.districtId.toString() !== districtId) {
    return sendError(res, 'Point does not belong to this district', 400, 'INVALID_DISTRICT');
  }

  // Check if district will have at least one point after deletion
  const pointCount = await prisma.majorPoint.count({
    where: { districtId: BigInt(districtId) },
  });

  if (pointCount <= 1) {
    return sendError(res, 'Cannot delete the last point. District must have at least one point.', 400, 'LAST_POINT');
  }

  // Delete the point
  await prisma.majorPoint.delete({
    where: { pointId: BigInt(pointId) },
  });

  sendSuccess(res, null, 'Major point deleted successfully');
});

/**
 * Search locations (districts and points)
 * GET /api/locations/search
 * @access Public
 */
exports.searchLocations = catchAsync(async (req, res) => {
  const { query, limit = 10 } = req.query;

  if (!query || query.trim().length < 2) {
    return sendError(res, 'Search query must be at least 2 characters', 400, 'QUERY_TOO_SHORT');
  }

  const searchTerm = query.trim();

  const [districts, points] = await Promise.all([
    // Search districts
    prisma.district.findMany({
      where: {
        name: { contains: searchTerm, mode: 'insensitive' },
      },
      select: {
        districtId: true,
        name: true,
      },
      take: parseInt(limit),
    }),
    // Search major points
    prisma.majorPoint.findMany({
      where: {
        name: { contains: searchTerm, mode: 'insensitive' },
      },
      select: {
        pointId: true,
        name: true,
        district: {
          select: {
            districtId: true,
            name: true,
          },
        },
      },
      take: parseInt(limit),
    }),
  ]);

  const results = {
    districts: districts.map((d) => ({
      districtId: d.districtId.toString(),
      name: d.name,
      type: 'district',
    })),
    points: points.map((p) => ({
      pointId: p.pointId.toString(),
      name: p.name,
      districtId: p.district.districtId.toString(),
      districtName: p.district.name,
      fullName: `${p.name}, ${p.district.name}`,
      type: 'point',
    })),
  };

  sendSuccess(res, results);
});

// module.exports = {
//   getAllLocations,
//   getLocationById,
//   addLocation,
//   updateLocation,
//   deleteLocation,
//   addMajorPoint,
//   deleteMajorPoint,
//   searchLocations,
// };