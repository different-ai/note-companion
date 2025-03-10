import { PropsWithChildren } from 'react'

// Fix for Select component
declare module '@radix-ui/react-select' {
  export interface SelectProps extends PropsWithChildren {}
  export interface SelectTriggerProps extends PropsWithChildren {}
  export interface SelectValueProps extends PropsWithChildren {}
  export interface SelectContentProps extends PropsWithChildren {}
  export interface SelectItemProps extends PropsWithChildren {}
  export interface SelectLabelProps extends PropsWithChildren {}
  export interface SelectGroupProps extends PropsWithChildren {}
}

// Fix for Dialog component
declare module '@radix-ui/react-dialog' {
  export interface DialogProps extends PropsWithChildren {}
  export interface DialogTriggerProps extends PropsWithChildren {}
  export interface DialogContentProps extends PropsWithChildren {}
  export interface DialogTitleProps extends PropsWithChildren {}
  export interface DialogDescriptionProps extends PropsWithChildren {}
}

// Fix for Tabs component
declare module '@radix-ui/react-tabs' {
  export interface TabsProps extends PropsWithChildren {}
  export interface TabsListProps extends PropsWithChildren {}
  export interface TabsTriggerProps extends PropsWithChildren {}
  export interface TabsContentProps extends PropsWithChildren {}
}

// Fix for Label component
declare module '@radix-ui/react-label' {
  export interface LabelProps extends PropsWithChildren {}
}

// Fix for Switch component 
declare module '@radix-ui/react-switch' {
  export interface SwitchProps extends PropsWithChildren {}
}

// Fix for Separator component
declare module '@radix-ui/react-separator' {
  export interface SeparatorProps extends PropsWithChildren {}
}
