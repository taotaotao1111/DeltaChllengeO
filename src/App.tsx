import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Sources from "./pages/Sources";

export default function App() {
  return (
    <BrowserRouter>
      <div className="noise-overlay" aria-hidden />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sources" element={<Sources />} />
      </Routes>
    </BrowserRouter>
  );
}
