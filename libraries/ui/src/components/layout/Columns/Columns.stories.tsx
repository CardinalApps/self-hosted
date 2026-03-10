import Columns from './Columns'
import Column from './Column'

export default {
  title: 'Layout/Columns',
  component: Columns,
}

export const HardColumns = () => {
  const rowStyle = {
    height: 140,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: 'var(--bg-5)',
  }
  const colStyle = {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'var(--bg-3)',
  }
  const width = 150
  return (
    <>
      <p style={{ marginBottom: 20 }}>Gaps, paddings, and margins are for demonstration purposes only.</p>
      <h1 style={{ marginBottom: 20 }}>Columns with minimum width</h1>
      <h3>cols=1 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
      </Columns>
      <h3>cols=2 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
        <Column style={colStyle} minWidth={width}>2</Column>
      </Columns>
      <h3>cols=3 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
        <Column style={colStyle} minWidth={width}>2</Column>
        <Column style={colStyle} minWidth={width}>3</Column>
      </Columns>
      <h3>cols=4 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
        <Column style={colStyle} minWidth={width}>2</Column>
        <Column style={colStyle} minWidth={width}>3</Column>
        <Column style={colStyle} minWidth={width}>4</Column>
      </Columns>
      <h3>cols=5 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
        <Column style={colStyle} minWidth={width}>2</Column>
        <Column style={colStyle} minWidth={width}>3</Column>
        <Column style={colStyle} minWidth={width}>4</Column>
        <Column style={colStyle} minWidth={width}>5</Column>
      </Columns>
      <h3>cols=6 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
        <Column style={colStyle} minWidth={width}>2</Column>
        <Column style={colStyle} minWidth={width}>3</Column>
        <Column style={colStyle} minWidth={width}>4</Column>
        <Column style={colStyle} minWidth={width}>5</Column>
        <Column style={colStyle} minWidth={width}>6</Column>
      </Columns>
      <h3>cols=7 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
        <Column style={colStyle} minWidth={width}>2</Column>
        <Column style={colStyle} minWidth={width}>3</Column>
        <Column style={colStyle} minWidth={width}>4</Column>
        <Column style={colStyle} minWidth={width}>5</Column>
        <Column style={colStyle} minWidth={width}>6</Column>
        <Column style={colStyle} minWidth={width}>7</Column>
      </Columns>
      <h3>cols=8 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
        <Column style={colStyle} minWidth={width}>2</Column>
        <Column style={colStyle} minWidth={width}>3</Column>
        <Column style={colStyle} minWidth={width}>4</Column>
        <Column style={colStyle} minWidth={width}>5</Column>
        <Column style={colStyle} minWidth={width}>6</Column>
        <Column style={colStyle} minWidth={width}>7</Column>
        <Column style={colStyle} minWidth={width}>8</Column>
      </Columns>
      <h3>cols=9 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
        <Column style={colStyle} minWidth={width}>2</Column>
        <Column style={colStyle} minWidth={width}>3</Column>
        <Column style={colStyle} minWidth={width}>4</Column>
        <Column style={colStyle} minWidth={width}>5</Column>
        <Column style={colStyle} minWidth={width}>6</Column>
        <Column style={colStyle} minWidth={width}>7</Column>
        <Column style={colStyle} minWidth={width}>8</Column>
        <Column style={colStyle} minWidth={width}>9</Column>
      </Columns>
      <h3>cols=10 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
        <Column style={colStyle} minWidth={width}>2</Column>
        <Column style={colStyle} minWidth={width}>3</Column>
        <Column style={colStyle} minWidth={width}>4</Column>
        <Column style={colStyle} minWidth={width}>5</Column>
        <Column style={colStyle} minWidth={width}>6</Column>
        <Column style={colStyle} minWidth={width}>7</Column>
        <Column style={colStyle} minWidth={width}>8</Column>
        <Column style={colStyle} minWidth={width}>9</Column>
        <Column style={colStyle} minWidth={width}>10</Column>
      </Columns>
      <h3>cols=11 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
        <Column style={colStyle} minWidth={width}>2</Column>
        <Column style={colStyle} minWidth={width}>3</Column>
        <Column style={colStyle} minWidth={width}>4</Column>
        <Column style={colStyle} minWidth={width}>5</Column>
        <Column style={colStyle} minWidth={width}>6</Column>
        <Column style={colStyle} minWidth={width}>7</Column>
        <Column style={colStyle} minWidth={width}>8</Column>
        <Column style={colStyle} minWidth={width}>9</Column>
        <Column style={colStyle} minWidth={width}>10</Column>
        <Column style={colStyle} minWidth={width}>11</Column>
      </Columns>
      <h3>cols=12 / min width={width}</h3>
      <Columns style={rowStyle}>
        <Column style={colStyle} minWidth={width}>1</Column>
        <Column style={colStyle} minWidth={width}>2</Column>
        <Column style={colStyle} minWidth={width}>3</Column>
        <Column style={colStyle} minWidth={width}>4</Column>
        <Column style={colStyle} minWidth={width}>5</Column>
        <Column style={colStyle} minWidth={width}>6</Column>
        <Column style={colStyle} minWidth={width}>7</Column>
        <Column style={colStyle} minWidth={width}>8</Column>
        <Column style={colStyle} minWidth={width}>9</Column>
        <Column style={colStyle} minWidth={width}>10</Column>
        <Column style={colStyle} minWidth={width}>11</Column>
        <Column style={colStyle} minWidth={width}>12</Column>
      </Columns>
    </>
  )
}

export const GridColumns = () => {
  const rowStyle = {
    height: 140,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: 'var(--bg-5)',
  }
  const colStyle = {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'var(--bg-3)',
  }
  return (
    <>
      <p style={{ marginBottom: 20 }}>Gaps, paddings, and margins are for demonstration purposes only.</p>
      <h1 style={{ marginBottom: 20 }}>Grid columns</h1>
      <p style={{ marginBottom: 20 }}>Grid columns use a 12 column flexible layout.</p>
      <Columns style={rowStyle}>
        <Column style={colStyle} cols={1}>1-col</Column>
      </Columns>
      <Columns style={rowStyle}>
        <Column style={colStyle} cols={1}>1-col</Column>
        <Column style={colStyle} cols={1}>1-col</Column>
      </Columns>
      <Columns style={rowStyle}>
        <Column style={colStyle} cols={3}>3-col</Column>
        <Column style={colStyle} cols={4}>4-col</Column>
        <Column style={colStyle} cols={3}>3-col</Column>
      </Columns>
      <Columns style={rowStyle}>
        <Column style={colStyle} cols={2}>2-col</Column>
        <Column style={colStyle} cols={2}>2-col</Column>
        <Column style={colStyle} cols={2}>2-col</Column>
        <Column style={colStyle} cols={2}>2-col</Column>
      </Columns>
      <Columns style={rowStyle}>
        <Column style={colStyle} cols={6}>6-col</Column>
        <Column style={colStyle} cols={6}>6-col</Column>
      </Columns>
      <Columns style={rowStyle}>
        <Column style={colStyle} cols={5}>5-col</Column>
        <Column style={colStyle} cols={3}>3-col</Column>
        <Column style={colStyle} cols={5}>5-col</Column>
        <Column style={colStyle} cols={3}>3-col</Column>
        <Column style={colStyle} cols={5}>5-col</Column>
      </Columns>
      <h3 style={{ marginBottom: 20 }}>Overflow</h3>
      <Columns style={{ ...rowStyle, height: 'auto' }} justifyContent="flex-start">
        <Column style={colStyle} cols={5}>5-col</Column>
        <Column style={colStyle} cols={1}>1-col</Column>
        <Column style={colStyle} cols={4}>4-col</Column>
        <Column style={colStyle} cols={7}>7-col</Column>
        <Column style={colStyle} cols={2}>2-col</Column>
        <Column style={colStyle} cols={6}>6-col</Column>
        <Column style={colStyle} cols={12}>12-col</Column>
        <Column style={colStyle} cols={2}>2-col</Column>
        <Column style={colStyle} cols={4}>4-col</Column>
        <Column style={colStyle} cols={5}>5-col</Column>
      </Columns>
    </>
  )
}

export const Responsive = () => {
  const rowStyle = {
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: 'var(--bg-5)',
  }
  const colStyle = {
    height: 140,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'var(--bg-3)',
  }
  return (
    <>
      <p style={{ marginBottom: 20 }}>Gaps, paddings, and margins are for demonstration purposes only.</p>
      <h1 style={{ marginBottom: 20 }}>Responsive columns</h1>
      <h3 style={{ marginBottom: 20 }}>Wrap at medium size</h3>
      <Columns style={rowStyle} flexWrap="medium">
        <Column style={colStyle} cols={2} mediumCols={4} smallCols={6}>desktop: 2, tablet: 4, mobile: 6</Column>
        <Column style={colStyle} cols={2} mediumCols={4} smallCols={6}>desktop: 2, tablet: 4, mobile: 6</Column>
        <Column style={colStyle} cols={2} mediumCols={4} smallCols={6}>desktop: 2, tablet: 4, mobile: 6</Column>
        <Column style={colStyle} cols={2} mediumCols={4} smallCols={6}>desktop: 2, tablet: 4, mobile: 6</Column>
        <Column style={colStyle} cols={2} mediumCols={4} smallCols={6}>desktop: 2, tablet: 4, mobile: 6</Column>
      </Columns>
      <h3 style={{ marginBottom: 20 }}>Wrap at small size</h3>
      <Columns style={rowStyle} flexWrap="small">
        <Column style={colStyle} cols={2} mediumCols={4} smallCols={6}>desktop: 2, tablet: 4, mobile: 6</Column>
        <Column style={colStyle} cols={2} mediumCols={4} smallCols={6}>desktop: 2, tablet: 4, mobile: 6</Column>
        <Column style={colStyle} cols={2} mediumCols={4} smallCols={6}>desktop: 2, tablet: 4, mobile: 6</Column>
        <Column style={colStyle} cols={2} mediumCols={4} smallCols={6}>desktop: 2, tablet: 4, mobile: 6</Column>
        <Column style={colStyle} cols={2} mediumCols={4} smallCols={6}>desktop: 2, tablet: 4, mobile: 6</Column>
      </Columns>
    </>
  )
}
