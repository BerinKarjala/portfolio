import React from "react";
import { NavLink } from "react-router-dom";
import { FaGithub, FaLinkedin } from "react-icons/fa";

export default function NavBar() {
  return (
    <header className="container flex">
      <div className="flex justify-between nav-bar py-5 drop-shadow-lg">
        <nav className="w-screen flex-nowrap">
          <NavLink
            to="/"
            exact
            activeClassName="text-white bg-blue-700"
            className="inflex-flex items-center p-2 rounded text-white hover:text-red-100 text-2xl font-bold tracking-widest"
          >
            Berin Karjala
          </NavLink>
          <NavLink
            to="/post"
            className="inflex-flex p-2 items-center rounded text-white hover:text-red-100"
            activeClassName="text-white-100 bg-blue-700"
          >
            Developer's Log
          </NavLink>
          <NavLink
            to="/project"
            className="inflex-flex p-2 items-center rounded text-white hover:text-red-100"
            activeClassName="text-red-100 bg-blue-700"
          >
            Projects
          </NavLink>
          <NavLink
            to="/about"
            className="inflex-flex p-2 items-center rounded text-white hover:text-red-100"
            activeClassName="text-red-100 bg-blue-700"
          >
            About Me!
          </NavLink>
          <div className="inline-flex p-2 items-centered">
            <a
              href="https://www.linkedin.com/in/berin-karjala-90846842/"
              className="mr-4 text-white"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="LinkedIn"
            >
              <FaLinkedin size={35} />
            </a>
            <a
              href="https://github.com/BerinKarjala/portfolio"
              className="mr-4 text-white"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub"
            >
              <FaGithub size={35} />
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
