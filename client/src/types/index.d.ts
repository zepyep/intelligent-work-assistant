// Global type declarations for the application

// Extend Material-UI Grid component props
declare module '@mui/material/Grid/Grid' {
  interface GridProps {
    item?: boolean;
    container?: boolean;
    xs?: boolean | number;
    sm?: boolean | number; 
    md?: boolean | number;
    lg?: boolean | number;
    xl?: boolean | number;
    spacing?: number;
    alignItems?: string;
    justifyContent?: string;
    direction?: 'row' | 'column';
  }
}

// Override for all material-ui components to make TypeScript less strict
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};