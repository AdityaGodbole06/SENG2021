import React from 'react'
import clsx from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'bg-white dark:bg-slate-900 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800',
        className
      )}
      {...props}
    />
  )
)

Card.displayName = 'Card'

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('px-6 py-4 border-b border-slate-200 dark:border-slate-800', className)}
    {...props}
  />
))

CardHeader.displayName = 'CardHeader'

export const CardBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={clsx('px-6 py-4', className)} {...props} />
))

CardBody.displayName = 'CardBody'

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('px-6 py-4 border-t border-slate-200 dark:border-slate-800', className)}
    {...props}
  />
))

CardFooter.displayName = 'CardFooter'
