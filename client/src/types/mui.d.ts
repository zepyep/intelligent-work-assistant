// Type augmentation for Material-UI Grid component to fix TypeScript issues
declare module '@mui/material/Grid' {
  interface GridProps {
    item?: boolean;
    container?: boolean;
    xs?: number | boolean;
    sm?: number | boolean;
    md?: number | boolean;
    lg?: number | boolean;
    xl?: number | boolean;
    spacing?: number;
    alignItems?: string;
    justifyContent?: string;
    direction?: 'row' | 'column';
  }
}

// Also augment the main module
declare module '@mui/material' {
  interface GridProps {
    item?: boolean;
    container?: boolean;
    xs?: number | boolean;
    sm?: number | boolean;
    md?: number | boolean;
    lg?: number | boolean;
    xl?: number | boolean;
    spacing?: number;
    alignItems?: string;
    justifyContent?: string;
    direction?: 'row' | 'column';
  }
}

export {};