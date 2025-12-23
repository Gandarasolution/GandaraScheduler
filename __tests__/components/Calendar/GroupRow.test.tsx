import React from 'react';
import { render, screen } from '@testing-library/react';
import GroupRow from '@/app/calendrier/components/Calendar/GroupRow';
import '@testing-library/jest-dom';

// 1. Mock des constantes pour faciliter les calculs
jest.mock('@/app/calendrier/utils/constants', () => ({
  CELL_WIDTH: 100, 
}));

jest.mock('@/app/calendrier/utils/domIds', () => ({
  getRowId: (type: string, id: string | number) => `${type}-${id}-test-id`,
}));


describe('GroupRow', () => {
  // Setup des props par défaut
  const defaultProps = {
    itemId: 'group-1',
    dayInTimeline: [1672531200000, 1672617600000], // 2 jours (timestamps)
    rowHeight: 50,
    style: {},
    todayIndex: -1, // Pas de ligne "Aujourd'hui" par défaut
    isFullDay: false,
  };

  it('renders the row container with correct attributes', () => {
    render(<GroupRow {...defaultProps} />);
    
    const row = screen.getByRole('row');
    
    // Vérifie l'ID généré par le mock getRowId
    expect(row).toHaveAttribute('id', 'group-group-1-test-id');
    // Vérifie le data attribute
    expect(row).toHaveAttribute('data-item-id', 'inactive-group-1');
    // Vérifie les classes CSS de base
    expect(row).toHaveClass('calendar-row', 'inactive-row', 'flex', 'w-fit', 'relative');
  });

  it('calculates dimensions correctly based on timeline length and constant', () => {
    render(<GroupRow {...defaultProps} />);
    
    const row = screen.getByRole('row');
    
    // Width = 2 jours * 100px (CELL_WIDTH mocké) = 200px
    expect(row).toHaveStyle({ width: '200px' });
    // Height = prop rowHeight
    expect(row).toHaveStyle({ height: '50px' });
  });

  it('applies custom style prop', () => {
    const customStyle = { opacity: 0.5, marginTop: '20px' };
    render(<GroupRow {...defaultProps} style={customStyle} />);
    
    const row = screen.getByRole('row');
    expect(row).toHaveStyle({ opacity: '0.5', marginTop: '20px' });
  });

  describe('Today Marker (Ligne rouge)', () => {
    it('does NOT render the today marker when todayIndex is negative', () => {
      const { container } = render(<GroupRow {...defaultProps} todayIndex={-1} />);
      // On cherche l'élément avec la classe spécifique
      const marker = container.querySelector('.calendar-today');
      expect(marker).not.toBeInTheDocument();
    });

    it('renders the today marker at the correct position when index is valid', () => {
      // Index 1 (2ème jour)
      const todayIndex = 1; 
      const { container } = render(<GroupRow {...defaultProps} todayIndex={todayIndex} />);
      
      const marker = container.querySelector('.calendar-today');
      expect(marker).toBeInTheDocument();
      
      // Calcul attendu : (index * CELL_WIDTH + CELL_WIDTH / 2) - 2
      // (1 * 100 + 100 / 2) - 2 = 100 + 50 - 2 = 148px
      expect(marker).toHaveStyle({ left: '148px' });
      expect(marker).toHaveStyle({ backgroundColor: '#ffcdde' });
    });
  });

  describe('Background Gradient (Grid Lines)', () => {
    it('renders correct gradient step for Full Day view', () => {
      render(<GroupRow {...defaultProps} isFullDay={true} />);
      
      const row = screen.getByRole('row');
      // En FullDay, le pas du gradient doit correspondre à CELL_WIDTH (100px)
      // Note: vérifier une string complexe de gradient est difficile, on vérifie qu'elle contient la bonne valeur
      const style = window.getComputedStyle(row);
      expect(style.backgroundImage).toContain('transparent 100px');
    });

    it('renders correct gradient step for Half Day view', () => {
      render(<GroupRow {...defaultProps} isFullDay={false} />);
      
      const row = screen.getByRole('row');
      // En HalfDay, le pas du gradient est CELL_WIDTH / 2 (50px)
      const style = window.getComputedStyle(row);
      expect(style.backgroundImage).toContain('transparent 50px');
    });
  });
});