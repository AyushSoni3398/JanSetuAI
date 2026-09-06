import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DistrictPage from "./pages/DistrictPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import MyReportsPage from "./pages/MyReportsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import RecommendationsPage from "./pages/RecommendationsPage.jsx";
import ReportPage from "./pages/ReportPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="districts/:districtId" element={<DistrictPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="my-reports" element={<MyReportsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
