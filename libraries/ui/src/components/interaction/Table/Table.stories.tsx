import { useState, useEffect } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { faker } from '@faker-js/faker'

import Table from './Table'
import Button from '../Button/Button'

const meta = {
  title: 'Interaction/Table',
  component: Table,
  argTypes: {},
} satisfies Meta<typeof Table>
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    header: [
      <Table.Col>Name</Table.Col>,
      <Table.Col>Job</Table.Col>,
      <Table.Col>Country</Table.Col>,
      <Table.Col>Age</Table.Col>,
      <Table.Col>Actions</Table.Col>,
    ],
    body: [
      [
        <Table.Col>Walter</Table.Col>,
        <Table.Col>Teacher</Table.Col>,
        <Table.Col>United States</Table.Col>,
        <Table.Col>41</Table.Col>,
        <Table.Col><Button onClick={() => alert('Jesse we have to cook!')}>Speak</Button></Table.Col>,
      ],
      [
        <Table.Col>Jessie</Table.Col>,
        <Table.Col>DEA Informant</Table.Col>,
        <Table.Col>United States</Table.Col>,
        <Table.Col>26</Table.Col>,
        <Table.Col><Button onClick={() => alert('This is my own private domicile and I will not be harassed. Bitch!')}>Speak</Button></Table.Col>,
      ],
      [
        <Table.Col>Flynn</Table.Col>,
        <Table.Col>Breakfast aficionado</Table.Col>,
        <Table.Col>United States</Table.Col>,
        <Table.Col>16</Table.Col>,
        <Table.Col><Button onClick={() => alert('*Throws up*')}>Speak</Button></Table.Col>,
      ],
      [
        <Table.Col>Gus</Table.Col>,
        <Table.Col>Chicken pimp</Table.Col>,
        <Table.Col>Chile</Table.Col>,
        <Table.Col>46</Table.Col>,
        <Table.Col><Button onClick={() => alert('POLLOS')}>Speak</Button></Table.Col>,
      ],
    ],
  },
}

export const withPagination = () => {
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState([])

  const getBody = () => {
    const body = []

    for (let i = 1; i <= 10; i++) {
      body.push([
        <Table.Col>{faker.name.firstName()}</Table.Col>,
        <Table.Col>{faker.name.lastName()}</Table.Col>,
        <Table.Col>{faker.random.locale()}</Table.Col>,
        <Table.Col>{faker.random.numeric(2, { allowLeadingZeros: true })}</Table.Col>,
        <Table.Col>{faker.company.name()}</Table.Col>,
      ])
    }

    return body
  }

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      setLoading(false)
      setBody(getBody())
    }, 750)
    return () => clearTimeout(timer)
  }, [page])

  return (
    <div style={{ padding: 20, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Table
        header={[
          <Table.Col>First Name</Table.Col>,
          <Table.Col>Last Name</Table.Col>,
          <Table.Col>Language</Table.Col>,
          <Table.Col>Age</Table.Col>,
          <Table.Col>Job</Table.Col>,
        ]}
        page={page}
        maxPages={42}
        onPageChange={(newPage) => setPage(newPage)}
        loading={loading}
        body={body}
        highlightRowOnHover={true}
        highlightColOnHover={true}
      />
    </div>
  )
}

export const Empty: Story = {
  args: {
    header: [
      <Table.Col>Name</Table.Col>,
      <Table.Col>Job</Table.Col>,
      <Table.Col>Country</Table.Col>,
      <Table.Col>Age</Table.Col>,
      <Table.Col>Actions</Table.Col>,
    ],
    body: undefined,
  },
}

export default meta
