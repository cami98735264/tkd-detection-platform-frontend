import { Link, Routes, Route, useNavigate } from "react-router-dom";

import Home from "./Home";
import About from "./About";
import Test from "./Test";
import NotFound from "./NotFound";

import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">

      {/* NAVBAR */}
      <nav className="flex items-center gap-6 p-4 bg-green-700 text-white shadow-md">

        <Link
          to="/dashboard"
          className="hover:underline"
        >
          Home
        </Link>

        <Link
          to="/dashboard/about"
          className="hover:underline"
        >
          About
        </Link>

        <Link
          to="/dashboard/test"
          className="hover:underline"
        >
          Test
        </Link>

        <Button
          onClick={handleLogout}
          variant="destructive"
          className="ml-auto"
        >
          Cerrar sesión
        </Button>

      </nav>

      {/* CONTENIDO */}
      <div className="p-6">

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/test" element={<Test />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

      </div>

    </div>
  );
}