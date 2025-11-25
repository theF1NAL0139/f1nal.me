import React, { useState } from 'react';
import './MobileMenu.css';

const MobileMenu = () => {
  // Состояние для отслеживания открытия/закрытия меню
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Список навигационных ссылок, как на оригинальном сайте
  const navItems = [
    { name: 'Work', href: '#work' },
    { name: 'Reel', href: '#reel' },
    { name: 'Play', href: '#play' },
    { name: 'About', href: '#about' },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Закрытие меню при клике на ссылку
  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="header">
      {/* Логотип/Название сайта */}
      <div className="logo">VLADIMIR POLITOV</div>

      {/* Кнопка-гамбургер (видна только на мобильных) */}
      <button
        className={`menu-toggle ${isMenuOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        {/* Элементы, которые примут форму 'X' при открытии */}
        <div className="bar top-bar"></div>
        <div className="bar middle-bar"></div>
        <div className="bar bottom-bar"></div>
      </button>

      {/* Полноэкранный оверлей меню */}
      <nav className={`mobile-menu ${isMenuOpen ? 'active' : ''}`}>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.name} className="nav-item">
              <a href={item.href} onClick={handleLinkClick}>
                {item.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
};

export default MobileMenu;