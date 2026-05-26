import { Outlet } from 'react-router-dom';

function MainLayout() {
  return (
    <div className="main-layout">
      {/* Landing page header can go here */}
      <Outlet />
    </div>
  );
}

export default MainLayout;
