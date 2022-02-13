import { BrowserRouter, Route, Switch } from "react-router-dom";
import Home from "./components/Home";
import About from "./components/About";
import SinglePost from "./components/SinglePost";
import Post from "./components/Post";
import Project from "./components/Project";
import NavBar from "./components/NavBar";
import Minesweeper from "./components/projects/Minesweeper";
import RPG from "./components/projects/RPG";
import ComponentSandbox from "./components/projects/ComponentSandbox";
import AdSense from 'react-adsense'




function App() {

  return (    
    <BrowserRouter>
    <NavBar />
      <Switch>
        <Route component={Home} path="/" exact />
        <Route component={About} path="/about" />
        <Route component={SinglePost} path="/post/:slug" />
        <Route component={Post} path="/post" />
        <Route component={Project} path="/project" />
        <Route component={Minesweeper} path="/projects/Minesweeper" />
        <Route component={RPG} path="/projects/RPG" />
        <Route component={ComponentSandbox} path="/projects/ComponentSandbox" />
      </Switch>
      <AdSense.Google
        client='pub-3336553805044512'
        slot='8275811156'
        style={{ display: 'block' }}
        format='auto'
        responsive='true'
        layoutKey='-gw-1+2a-9x+5c'
      />
    </BrowserRouter>);
  
}

export default App;
