import React from "react";
import { NavLink } from "react-router-dom";
import { SocialIcon } from "react-social-icons";

export default function NavBar() {
  return (
    <header className="container">
      <div className="mx-auto flex-initial justify-between nav-bar py-5 drop-shadow-lg">
        <nav className="mx-auto w-screen flex-nowrap">
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
          <SocialIcon
            url="https://www.linkedin.com/in/berin-karjala-90846842/"
            className="mr-4"
            target="_blank"
            fgColor="#fff"
            style={{ height: 35, width: 35 }}
          />
          <SocialIcon
            url="https://github.com/BerinKarjala/portfolio"
            className="mr-4"
            target="_blank"
            fgColor="#fff"
            bgColor="green"
            style={{ height: 35, width: 35 }}
          />
        </div>
        </nav>
      </div>
    </header>
  );
}
