import { useState, useEffect } from 'react'
import * as d3 from 'd3'
import Plot from 'react-plotly.js'

// const API = 'https://genomicsapp.onrender.com'
const API = ''

const parseFloatSafe = val => {
  const num = parseFloat(val)
  return isNaN(num) ? null : num
}

const formatStatus = status => {
  const s = (status || '').toLowerCase()
  if (s.includes('somatic')) return 'Somatic'
  if (s.includes('unknown')) return 'Unknown'
  return '—'
}

const formatConsequenceShort = cons => {
  if (!cons) return '—'
  const first = cons.split('|')[0]
  return first.replace(/_/g, ' ')
}

const formatConsequenceLong = cons => {
  if (!cons) return '—'
  return cons.split('|').map(c => c.replace(/_/g, ' ')).join('\n')
}

const formatPolyPhenShort = val => {
  if (!val) return 'N/A'
  return val.split('|')[0]
}

const formatPolyPhenLong = val => {
  if (!val) return 'N/A'
  return val.split('|').join('\n')
}


const App = () => {
  const [file, setFile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [txtData, setTxtData] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [loadingResult, setLoadingResult] = useState(false)
  const [selectedConsequence, setSelectedConsequence] = useState(null)
  const [selectedPolyPhen, setSelectedPolyPhen] = useState(null)
  const [externalIds, setExternalIds] = useState({})
  const [externalLoading, setExternalLoading] = useState(false)


  const handleViewMore = async (row) => {
    setSelectedRow(row)
    setExternalIds({})
    setExternalLoading(true)

    if (!row.gnomAD_link) {
    setExternalLoading(false)
    return
  }

    try {
      const res = await fetch(`/gnomad/refs?url=${encodeURIComponent(row.gnomAD_link)}`)
      const json = await res.json()
      setExternalIds(json)
    } catch (err) {
      console.error('Failed to fetch external references:', err)
    } finally {
      setExternalLoading(false)
    }
  }


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
        const parsed = d3.csvParse(json.data)
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
            {/* Interactive Table */}
            <h2 className="subtitle" style={{ marginTop: '2rem' }}> Variant Summary</h2>
            <div className="interactive-table">
              <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Gene</th>
                    <th>Variant</th>
                    <th>Class</th>
                    <th>MUT Status</th>
                    <th>Consequence</th>
                    <th>Poly Phen</th>
                    <th>Pop Freq</th>
                    <th>COSMIC</th>
                    <th>View More</th>
                  </tr>
                </thead>
                <tbody>
                  {txtData.map((row, i) => (
                    <tr key={i}>
                      <td>{row.Gene}</td>
                      <td>{row.Variant}</td>
                      <td>{row.VARIANT_CLASS}</td>
                      <td>
                        <span className={`mut-status ${formatStatus(row.MUT_STATUS_CALLS).toLowerCase()}`}>
                          {formatStatus(row.MUT_STATUS_CALLS)}
                        </span>
                      </td>

                      <td>
                        <span 
                          style={{ cursor: 'pointer', textDecoration: 'underline' }} 
                          onClick={() => setSelectedConsequence(row.Consequence)}
                        >
                          {formatConsequenceShort(row.Consequence)}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{ cursor: row.PolyPhen ? 'pointer' : 'default', textDecoration: row.PolyPhen ? 'underline' : 'none' }}
                          onClick={() => row.PolyPhen && setSelectedPolyPhen(row.PolyPhen)}
                        >
                          {formatPolyPhenShort(row.PolyPhen)}
                        </span>
                      </td>
                      <td>{row.gnomAD_AF}</td>
                      <td>
                        {row.COSMIC_link ? (
                        <a href={row.COSMIC_link} target="_blank" rel="noopener noreferrer">
                          Link
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <button className="detail-btn" onClick={() => handleViewMore(row)}>
                        View More
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}
      </div>
             {selectedConsequence && (
        <div className="modal-overlay" onClick={() => setSelectedConsequence(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>All Consequences</h2>
            <pre style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
              {formatConsequenceLong(selectedConsequence)}
            </pre>
            <button className="modal-close" onClick={() => setSelectedConsequence(null)}>Close</button>
          </div>
        </div>
      )}
      {selectedPolyPhen && (
        <div className="modal-overlay" onClick={() => setSelectedPolyPhen(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>All PolyPhen Predictions</h2>
            <pre style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
              {formatPolyPhenLong(selectedPolyPhen)}
            </pre>
            <button className="modal-close" onClick={() => setSelectedPolyPhen(null)}>Close</button>
          </div>
        </div>
      )}
      {selectedRow && (
        <div className="modal-overlay" onClick={() => setSelectedRow(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Variant Details</h2>
            <table className="modal-table">
              <tbody>
                <tr>
                  <td><strong>cDNA Change</strong></td>
                  <td>{selectedRow.cDNA_change || '—'}</td>
                </tr>
                <tr>
                  <td><strong>Protein Change</strong></td>
                  <td>{selectedRow.Protein_change || '—'}</td>
                </tr>
                <tr>
                  <td><strong>gnomAD</strong></td>
                  <td>
                    {selectedRow.gnomAD_link ? (
                      <a href={selectedRow.gnomAD_link} target="_blank" rel="noopener noreferrer">
                      View on gnomAD
                    </a>
                  ) : '—'}
                </td>
              </tr>
              {externalLoading && (
  <tr>
    <td colSpan={2} className="loading-note">...</td>
  </tr>
)}

            {externalIds.dbSNP && (
                <tr>
                  <td><strong>dbSNP</strong></td>
                  <td>
                    <a href={`https://www.ncbi.nlm.nih.gov/snp/${externalIds.dbSNP}`} target="_blank" rel="noopener noreferrer">
                      {externalIds.dbSNP}
                  </a>
                </td>
              </tr>
                )}

            {externalIds.ClinVar && (
              <tr>
                <td><strong>ClinVar</strong></td>
                <td>
                  <a href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${externalIds.ClinVar}/`} target="_blank" rel="noopener noreferrer">
                    {externalIds.ClinVar}
                  </a>
                </td>
              </tr>
            )}

            {externalIds.ClinGen && (
            <tr>
              <td><strong>ClinGen</strong></td>
                <td>
                  <a href={`https://reg.clinicalgenome.org/redmine/projects/registry/genboree_registry/by_canonicalid?canonicalid=${externalIds.ClinGen}`} target="_blank" rel="noopener noreferrer">
                    {externalIds.ClinGen}
                  </a>
                </td>
              </tr>
            )}

            </tbody>
          </table>
      <button className="modal-close" onClick={() => setSelectedRow(null)}>Close</button>
    </div>
  </div>
)}
     

    </div>

  )
}

export default App
