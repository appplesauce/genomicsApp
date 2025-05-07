import { useState, useEffect } from 'react'
import * as d3 from 'd3'
import Plot from 'react-plotly.js'

//const API = 'http://localhost:5000'
const API = 'https://genomicsapp.onrender.com'

const parseFloatSafe = val => {
  const num = parseFloat(val)
  return isNaN(num) ? null : num
}

const App = () => {
  const [file, setFile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [txtData, setTxtData] = useState(null)

  const handleUpload = async () => {
    if (!file) return alert('Choose a VCF file.')

    const formData = new FormData()
    formData.append('vcf', file)

    const res = await fetch(`${API}/upload`, {
      method: 'POST',
      body: formData,
    })

    const { userId } = await res.json()
    setUserId(userId)
  }

  useEffect(() => {
    if (!userId) return

    const interval = setInterval(async () => {
      const res = await fetch(`${API}/result/${userId}`)
      if (res.status === 200) {
        const json = await res.json()
        const parsed = d3.tsvParse(json.data)
        setTxtData(parsed)
        clearInterval(interval)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [userId])
 
  return (
    <div className="app-container">
      <h1 style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '1rem', color: '#4f46e5' }}>
        Genomic VCF Upload & Visualization
      </h1>
  
      <div className="upload-area">
        <input type="file" accept=".vcf" onChange={e => setFile(e.target.files[0])} />
        <button onClick={handleUpload}>Submit VCF File</button>
      </div>
  
      {userId && (
        <p className="status">
          Waiting for result... Your session ID: <strong>{userId}</strong>
        </p>
      )}
  
      {txtData && (
        <div className="data-section">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Result Preview</h2>
          <table>
            <thead>
              <tr>
                {Object.keys(txtData[0])
                  .filter(key => !key.startsWith('Otherinfo'))
                  .map(key => (
                    <th key={key}>{key}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {txtData.slice(0, 10).map((row, i) => (
                <tr key={i}>
                  {Object.entries(row)
                    .filter(([key]) => !key.startsWith('Otherinfo'))
                    .map(([key, val]) => (
                      <td key={key}>{val}</td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="subtitle" style={{ marginTop: '2rem' }}>Interactive Variant Summary</h2>
    <div className="interactive-table">
      <table>
        <thead>
          <tr>
            <th>Gene</th>
            <th>Protein Change</th>
            <th>Function</th>
            <th>ClinVar</th>
            <th>COSMIC</th>
            <th>Pop Freq</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {txtData.map((row, i) => {
            const gene = row['Gene.refGene']
            const aaChange = row['AAChange.refGene']
            const exonicFunc = row['ExonicFunc.refGene']
            const clinVar = row['clinvar_20220320']
            const cosmic = row['cosmic88']
            const freq = parseFloat(row['gnomAD_genome_ALL'])

            const clinClass = (clinVar || '').toLowerCase().includes('pathogenic')
              ? 'clin-pathogenic'
              : (clinVar || '').toLowerCase().includes('benign')
              ? 'clin-benign'
              : (clinVar || '').toLowerCase().includes('uncertain')
              ? 'clin-uncertain'
              : 'clin-unknown'

            return (
              <tr key={i}>
                <td>
                  <a href={`https://www.ncbi.nlm.nih.gov/gene/?term=${gene}`} target="_blank" rel="noreferrer">
                    {gene}
                  </a>
                </td>
                <td><code>{aaChange}</code></td>
                <td>{exonicFunc}</td>
                <td><span className={`clin-label ${clinClass}`}>{clinVar || 'Unknown'}</span></td>
                <td>
                  {cosmic && cosmic.trim() !== '' ? (
                    <a href={`https://cancer.sanger.ac.uk/cosmic/search?q=${cosmic}`} target="_blank" rel="noreferrer">
                      🧬
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td style={{ color: freq > 0.01 ? '#999' : 'inherit' }}>
                  {isNaN(freq) ? '-' : freq.toFixed(4)}
                </td>
                <td>
                  <button className="detail-btn" onClick={() => alert(JSON.stringify(row, null, 2))}>
                    View
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
        </div>
        )}
      </div>
  )
}

export default App