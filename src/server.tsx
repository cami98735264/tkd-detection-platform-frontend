import { renderToString } from 'react-dom/server';
import Home from './pages/Home';
import About from './pages/About';
import NotFound from './pages/NotFound';
import Test from './pages/Test';

// Simple shell component for SSR - matches the client structure
function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div>
			<nav style={{ padding: '1rem', background: '#f0f0f0', marginBottom: '1rem' }}>
				<a href="/" style={{ marginRight: '1rem' }}>Home</a>
				<a href="/about" style={{ marginRight: '1rem' }}>About</a>
			</nav>
			{children}
		</div>
	);
}

export function renderApp(url: string): string {
	// Determine which component to render based on URL
	let content: React.ReactNode;
	
	switch (url) {
		case '/':
			content = <Home />;
			break;
		case '/about':
			content = <About />;
			break;
        case '/test':
            content = <Test />;
            break;
		default:
			content = <NotFound />;

	}

	const html = renderToString(<AppShell>{content}</AppShell>);

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>TKD Frontend</title>
	</head>
	<body>
		<div id="root">${html}</div>
		<script type="module" src="/client.js"></script>
	</body>
</html>`;
}
