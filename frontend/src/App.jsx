import { useState, useEffect } from 'react'
import * as d3 from 'd3'
import Plot from 'react-plotly.js'

{/*const API = 'http://localhost:5000'*/}
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

            {/* Graphs Section */}
            <div className="mt-10 space-y-12">

              {/* Bar: Variants per Gene */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-2"> Variants Per Gene</h3>
                <Plot
                  data={[
                    {
                      type: 'bar',
                      x: Object.entries(
                        txtData.reduce((acc, row) => {
                          acc[row['Gene.refGene']] = (acc[row['Gene.refGene']] || 0) + 1
                          return acc
                        }, {})
                      ).map(([gene]) => gene),
                      y: Object.entries(
                        txtData.reduce((acc, row) => {
                          acc[row['Gene.refGene']] = (acc[row['Gene.refGene']] || 0) + 1
                          return acc
                        }, {})
                      ).map(([_, count]) => count),
                      marker: { color: '#7b61ff' },
                    },
                  ]}
                  layout={{
                    height: 300,
                    margin: { t: 20, b: 100 },
                    xaxis: { tickangle: -45, title: 'Gene' },
                    yaxis: { title: 'Variant Count' },
                  }}
                />
              </div>

              {/* Pie: Exonic Function Distribution */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-2"> Variant Type Distribution</h3>
                <Plot
                  data={[
                    {
                      type: 'pie',
                      labels: Object.entries(
                        txtData.reduce((acc, row) => {
                          const type = row['ExonicFunc.refGene'] || 'Unknown'
                          acc[type] = (acc[type] || 0) + 1
                          return acc
                        }, {})
                      ).map(([type]) => type),
                      values: Object.entries(
                        txtData.reduce((acc, row) => {
                          const type = row['ExonicFunc.refGene'] || 'Unknown'
                          acc[type] = (acc[type] || 0) + 1
                          return acc
                        }, {})
                      ).map(([_, count]) => count),
                      hole: 0.4,
                    },
                  ]}
                  layout={{
                    height: 300,
                    margin: { t: 20 },
                    title: 'Variant Types',
                  }}
                />
              </div>

              {/* gnomAD Frequencies */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-2"> gnomAD Population Frequencies</h3>
                <Plot
                  data={[
                    {
                      type: 'histogram',
                      x: txtData
                        .map(row => parseFloat(row['gnomAD_genome_ALL']))
                        .filter(val => !isNaN(val)),
                      marker: { color: '#00b894' },
                      nbinsx: 10,
                    },
                  ]}
                  layout={{
                    height: 300,
                    xaxis: { title: 'Frequency' },
                    yaxis: { title: 'Count' },
                  }}
                />
              </div>
              {/* ClinVar Pathogenicity Pie Chart */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-2">🧪 ClinVar Pathogenicity Distribution</h3>
                <Plot
                  data={[
                    {
                      type: 'pie',
                      labels: Object.entries(
                        txtData.reduce((acc, row) => {
                          const sig = row['clinvar_20220320'] || 'Unknown'
                          acc[sig] = (acc[sig] || 0) + 1
                          return acc
                        }, {})
                      ).map(([label]) => label),
                      values: Object.entries(
                        txtData.reduce((acc, row) => {
                          const sig = row['clinvar_20220320'] || 'Unknown'
                          acc[sig] = (acc[sig] || 0) + 1
                          return acc
                        }, {})
                      ).map(([_, count]) => count),
                      textinfo: 'label+percent',
                      hole: 0.3,
                    },
                  ]}
                  layout={{
                    height: 300,
                    margin: { t: 30 },
                    title: 'ClinVar Clinical Significance',
                  }}
                />
              </div>
              {/* Scatter: AF vs Clinical Significance */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-2"> Allele Frequency vs Clinical Significance</h3>
                <Plot
                  data={Object.entries(
                    txtData.reduce((acc, row) => {
                      const sig = row['clinvar_20220320'] || 'Unknown'
                      const af = parseFloatSafe(row['gnomAD_genome_ALL'])
                      if (!isNaN(af)) {
                        acc[sig] = acc[sig] || []
                        acc[sig].push(af)
                      }
                      return acc
                    }, {})
                  ).map(([sig, afList]) => ({
                    x: afList,
                    y: Array(afList.length).fill(sig),
                    mode: 'markers',
                    type: 'scatter',
                    name: sig,
                  }))}
                  layout={{
                    height: 400,
                    title: 'gnomAD Allele Frequency vs Clinical Significance',
                    xaxis: { title: 'Allele Frequency (log)', type: 'log' },
                    yaxis: { title: 'ClinVar Significance' },
                  }}
                />
              </div>
              {/* Bar: COSMIC-Matched Variants per Gene */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-2"> COSMIC-Matched Variants per Gene</h3>
                <Plot
                  data={[
                    {
                      type: 'bar',
                      x: Object.entries(
                        txtData.reduce((acc, row) => {
                          if (row['cosmic88'] && row['cosmic88'].trim() !== '') {
                            const gene = row['Gene.refGene'] || 'Unknown'
                            acc[gene] = (acc[gene] || 0) + 1
                          }
                          return acc
                        }, {})
                      ).map(([gene]) => gene),
                      y: Object.entries(
                        txtData.reduce((acc, row) => {
                          if (row['cosmic88'] && row['cosmic88'].trim() !== '') {
                            const gene = row['Gene.refGene'] || 'Unknown'
                            acc[gene] = (acc[gene] || 0) + 1
                          }
                          return acc
                        }, {})
                      ).map(([_, count]) => count),
                      marker: { color: '#ff7675' },
                    },
                  ]}
                  layout={{
                    height: 300,
                    margin: { t: 30, b: 100 },
                    xaxis: { title: 'Gene', tickangle: -45 },
                    yaxis: { title: '# COSMIC-Matched Variants' },
                    title: 'Known Cancer-Associated Mutations',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
