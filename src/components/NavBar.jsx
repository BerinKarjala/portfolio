import React from "react";
import { NavLink } from "react-router-dom";
import { FaGithub, FaLinkedin } from "react-icons/fa";

function moveNavigationFocus(event) {
  if (
    event.defaultPrevented || event.altKey || event.ctrlKey ||
    event.metaKey || event.shiftKey
  ) return;

  const links = Array.from(event.currentTarget.querySelectorAll("a[href]"));
  const current = links.indexOf(event.target.closest("a[href]"));
  if (current < 0) return;

  let next;
  switch (event.key) {
    case "ArrowLeft":
    case "ArrowUp":
      next = (current - 1 + links.length) % links.length;
      break;
    case "ArrowRight":
    case "ArrowDown":
      next = (current + 1) % links.length;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = links.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  links[next].focus();
}

export default function NavBar() {
  const navLinkBaseClasses =
    "inline-flex items-center px-3 sm:px-5 py-1.5 sm:py-1 rounded nav-item text-white hover:text-red-100 transition duration-300 focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2 focus:ring-offset-green-900";

  const getNavLinkClasses = (extraClasses = "") => ({ isActive }) =>
    `${navLinkBaseClasses} ${extraClasses}${isActive ? " nav-active" : ""}`;

  return (
    <header className="w-full nav-bar shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Primary"
          className="portfolio-nav flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4"
          onKeyDown={moveNavigationFocus}
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-5">
            <NavLink
              to="/"
              end
              className={getNavLinkClasses("text-lg sm:text-xl font-bold tracking-widest ")}
            >
              Berin Karjala
            </NavLink>
            <NavLink
              to="/project"
              className={getNavLinkClasses("text-base sm:text-lg ")}
            >
              Projects
            </NavLink>
            <NavLink
              to="/about"
              className={getNavLinkClasses("text-base sm:text-lg ")}
            >
              About Me!
            </NavLink>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 mt-1 sm:mt-0">
            <a
              href="https://www.linkedin.com/in/berin-karjala-90846842/"
              className="text-white hover:text-emerald-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2 focus:ring-offset-green-900 rounded"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="LinkedIn"
            >
              <FaLinkedin size={30} className="sm:w-9 sm:h-9" />
            </a>
            <a
              href="https://github.com/BerinKarjala/portfolio"
              className="text-white hover:text-emerald-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2 focus:ring-offset-green-900 rounded"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub"
            >
              <FaGithub size={30} className="sm:w-9 sm:h-9" />
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
