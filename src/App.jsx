/* eslint-disable react/no-unknown-property */
import { useState } from 'react';
import './App.css';
import RobotSimulation from './components/RobotSimulation';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="App">
      <div className={`Menu ${isMenuOpen ? 'open' : ''}`}>
        <p>Menú</p>
        <a href="#section1">Sección 1</a>
        <a href="#section2">Sección 2</a>
      </div>
      <div className="MenuButton" color='blue' onClick={toggleMenu}>
        &#9776;
      </div>
      <RobotSimulation />

    </div>
  );
}

export default App;
