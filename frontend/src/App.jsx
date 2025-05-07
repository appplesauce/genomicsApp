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
    <div className="h-screen w-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-10">
        <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">
          Genomic VCF Upload & Visualization
        </h1>
  
        {/* Upload form */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <input
            type="file"
            accept=".vcf"
            onChange={e => setFile(e.target.files[0])}
            className="w-full md:w-2/3 p-3 border border-gray-300 rounded"
          />
          <button
            onClick={handleUpload}
            className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            Submit VCF File
          </button>
        </div>
  
        {/* Status message */}
        {userId && (
          <p className="text-center text-sm text-gray-600 mb-6">
            Waiting for results... Session ID: <strong>{userId}</strong>
          </p>
        )}
  
        {/* Result data */}
        {txtData && (
          <div className="space-y-10">
            {/* Table */}
            <div className="overflow-auto max-h-96 border border-gray-300 rounded-lg shadow-sm">
              <table className="min-w-full text-sm text-gray-700 table-auto border-collapse">
                <thead className="bg-indigo-100 sticky top-0 z-10">
                  <tr>
                    {Object.keys(txtData[0])
                      .filter(key => !key.startsWith('Otherinfo'))
                      .map(key => (
                        <th key={key} className="px-4 py-2 font-semibold border border-gray-200 whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {txtData.slice(0, 10).map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {Object.entries(row)
                        .filter(([key]) => !key.startsWith('Otherinfo'))
                        .map(([key, value]) => (
                          <td key={key} className="px-4 py-2 border border-gray-200">
                            {key === 'AAChange.refGene'
                              ? <code className="text-blue-600 font-mono">{value}</code>
                              : key === 'Gene.refGene'
                              ? <strong className="text-purple-700">{value}</strong>
                              : value}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
