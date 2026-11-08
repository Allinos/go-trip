import { Link } from 'react-router-dom';
import { useFilters, useList } from '../lib/hooks';
import { Badge, DataTable, Pagination } from '../components/ui';
import { date, label, rupees } from '../lib/format';

export default function GoodsOrders() {
  const [f, setF] = useFilters();
  const { data } = useList('goods', '/goods-orders', f);
  const enabled = data?.meta?.featureEnabled;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Goods transport orders</h1>
          <p>Customers post goods to move; fleet partners see them and call the customer</p>
        </div>
      </div>
      {data && !enabled && (
        <div className="alert">
          This feature is <strong>disabled</strong>. The apps hide it and the API refuses requests. Turn it on in <Link to="/settings">Settings</Link> when you are ready.
        </div>
      )}
      <div className="card">
        <DataTable
          rows={data?.data}
          empty="No goods orders yet"
          columns={[
            { title: 'Route', render: (o) => `${o.pickupName} → ${o.dropName}` },
            { title: 'Goods', render: (o) => `${o.goodsType}${o.weightKg ? ` · ${o.weightKg} kg` : ''}` },
            { title: 'Vehicle', render: (o) => label(o.vehicleClass) },
            { title: 'Pickup date', render: (o) => date(o.pickupDate) },
            { title: 'Budget', render: (o) => rupees(o.budget) },
            { title: 'Customer', render: (o) => `${o.user.fullName || ''} ${o.user.phone}` },
            { title: 'Status', render: (o) => <Badge status={o.status} /> },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setF({ page })} />
      </div>
    </>
  );
}
