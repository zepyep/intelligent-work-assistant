import React from 'react';
import { Grid as MuiGrid } from '@mui/material';

interface GridProps {
  children: React.ReactNode;
  container?: boolean;
  item?: boolean;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  spacing?: number;
  alignItems?: string;
  justifyContent?: string;
  direction?: 'row' | 'column';
  sx?: any;
  [key: string]: any;
}

const CustomGrid: React.FC<GridProps> = ({ children, ...props }) => {
  return (
    // @ts-ignore - Bypass TypeScript issues with MUI Grid
    <MuiGrid {...props}>
      {children}
    </MuiGrid>
  );
};

export default CustomGrid;