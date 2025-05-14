import { useState, useEffect } from 'react'
import * as d3 from 'd3'
import Plot from 'react-plotly.js'

// const API = 'https://genomicsapp.onrender.com'
const API = ''

const parseFloatSafe = val => {
  const num = parseFloat(val)
  return isNaN(num) ? null : num
}

// Modal component
const DetailModal = ({ row, onClose }) => {
  const [geneId, setGeneId] = useState(null)
  const [loadingGene, setLoadingGene] = useState(false)

  useEffect(() => {
    const fetchGeneId = async () => {
      const symbol = row?.['Gene.refGene']
      if (!symbol) return

      setLoadingGene(true)
      const query = encodeURIComponent(`${symbol}[Gene Name] AND Homo sapiens[Organism]`)
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=${query}&retmode=json`

      try {
        const res = await fetch(url)
        const json = await res.json()
        const id = json.esearchresult?.idlist?.[0]
        setGeneId(id || null)
      } catch (err) {
        console.error('Failed to fetch NCBI gene ID:', err)
        setGeneId(null)
      } finally {
        setLoadingGene(false)
      }
    }

    if (row) fetchGeneId()
  }, [row])

  if (!row) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Variant Details</h2>

        <table className="modal-table">
          <tbody>
            {Object.entries(row).map(([key, value]) => (
              <tr key={key}>
                <td><strong>{key}</strong></td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="gene-iframe">
          <h3>🧬 NCBI Gene Summary</h3>

          {loadingGene && (
            <div className="spinner">
              🔍 Fetching gene ID
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </div>
          )}

          {geneId && !loadingGene && (
            <>
              <iframe
                title="NCBI Gene Summary"
                src={`https://www.ncbi.nlm.nih.gov/gene/${geneId}`}
                style={{ width: '100%', height: '400px', border: '1px solid #ccc', borderRadius: '6px' }}
              ></iframe>
              <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                <a
                  href={`https://www.ncbi.nlm.nih.gov/gene/${geneId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.9rem', color: '#4f46e5', textDecoration: 'underline' }}
                >
                  🔗 View full summary on ncbi.nlm.nih.gov
                </a>
              </div>
            </>
          )}
        </div>

        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

const App = () => {
  const [file, setFile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [txtData, setTxtData] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [loadingResult, setLoadingResult] = useState(false)


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
  
    setLoadingResult(true)
  
    const interval = setInterval(async () => {
      const res = await fetch(`${API}/result/${userId}`)
      if (res.status === 200) {
        const json = await res.json()
        const parsed = d3.tsvParse(json.data)
        setTxtData(parsed)
        setLoadingResult(false)
        clearInterval(interval)
      }
    }, 1000)
  
    return () => clearInterval(interval)
  }, [userId])
  

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Genomic VCF Upload & Visualization</h1>

        <div className="upload-area">
          <input type="file" accept=".vcf" onChange={e => setFile(e.target.files[0])} />
          <button onClick={handleUpload}>Submit VCF File</button>
        </div>

        {userId && (
          <>
            <p className="status">
              Your session ID: <strong>{userId}</strong>
            </p>
            {loadingResult && (
              <div className="spinner">
              <span>📄 Waiting for annotated result</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </div>            
            )}
          </>
        )}

        {txtData && (
          <div className="data-section">
            <h2 className="subtitle">Raw Table Preview</h2>
            <div className="table-scroll">
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
            </div>

            {/* Interactive Table */}
            <h2 className="subtitle" style={{ marginTop: '2rem' }}> Variant Summary</h2>
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
                    <th>View More</th>
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
                      <tr key={i} onClick={() => setSelectedRow(row)} style={{ cursor: 'pointer' }}>
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
                          <button className="detail-btn">View</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      </div>
    </div>
  )
}

export default App
