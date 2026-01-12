import React from 'react'

interface ExampleComponentProps {
  title: string
}

export const ExampleComponent: React.FC<ExampleComponentProps> = ({ title }) => {
  return <div>{title}</div>
}
