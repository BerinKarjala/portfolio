import React from "react";
import { NavLink } from "react-router-dom";
import { FaGithub, FaLinkedin } from "react-icons/fa";

export default function NavBar() {
  return (
    <header className="w-full nav-bar shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
          <nav className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-5">
            <NavLink
              to="/"
              exact
              activeClassName="nav-active"
              className="inflex-flex items-center px-5 py-1 rounded nav-item text-white hover:text-red-100 transition duration-300 text-lg sm:text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2 focus:ring-offset-green-900"
            >
              Berin Karjala
            </NavLink>
            <NavLink
              to="/project"
              className="inflex-flex px-5 py-1 items-center rounded nav-item text-white hover:text-red-100 transition duration-300 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2 focus:ring-offset-green-900"
              activeClassName="nav-active"
            >
              Projects
            </NavLink>
            <NavLink
              to="/about"
              className="inflex-flex px-5 py-1 items-center rounded nav-item text-white hover:text-red-100 transition duration-300 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2 focus:ring-offset-green-900"
              activeClassName="nav-active"
            >
              About Me!
            </NavLink>
          </nav>
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
        </div>
      </div>
    </header>
  );
}
