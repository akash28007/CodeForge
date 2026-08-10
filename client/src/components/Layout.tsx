import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

/**
 * The solve page owns its own full-height split pane and manages its own scrolling,
 * so a footer underneath it would either be unreachable or break the layout.
 */
// `/problems/new` is excluded — that's the admin create form, an ordinary page.
const HIDE_FOOTER = [/^\/problems\/(?!new$)[^/]+$/];

export default function Layout() {
  const { pathname } = useLocation();
  const showFooter = !HIDE_FOOTER.some((pattern) => pattern.test(pathname));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 animate-fade-in">
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
