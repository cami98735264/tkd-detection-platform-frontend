import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import NotFound from './pages/NotFound';
import Test from './pages/Test';

export default function App() {
	return (
		<BrowserRouter>
			<div>
				<nav style={{ padding: '1rem', background: '#f0f0f0', marginBottom: '1rem' }}>
					<Link to="/" style={{ marginRight: '1rem' }}>Home</Link>
					<Link to="/about" style={{ marginRight: '1rem' }}>About</Link>
					<Link to="/test" style={{ marginRight: '1rem' }}>Test</Link>
				</nav>

				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/about" element={<About />} />
					<Route path="/test" element={<Test />} />
					<Route path="*" element={<NotFound />} />
				</Routes>
			</div>
		</BrowserRouter>
	);
}
