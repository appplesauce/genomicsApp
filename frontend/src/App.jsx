import { useState, useEffect } from 'react'
import * as d3 from 'd3'
import Plot from 'react-plotly.js'

const API = 'http://localhost:5000'

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
    <div className="min-h-screen bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-100 py-8">
      <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-xl">
        <h1 className="text-4xl font-semibold text-center text-blue-700 mb-6">
          Genomic VCF File Upload & Visualization
        </h1>

        <div className="flex justify-center items-center gap-4 mb-8">
          <input
            type="file"
            accept=".vcf"
            onChange={e => setFile(e.target.files[0])}
            className="w-2/3 p-3 border border-gray-300 rounded-lg"
          />
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
            onClick={handleUpload}
          >
            Submit VCF File
          </button>
        </div>

        {userId && (
          <p className="text-center text-sm text-gray-600 mb-4">
            Waiting for results... Your session ID: <strong>{userId}</strong>
          </p>
        )}

        {txtData && (
          <div>
            {/* Table Section */}
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-center text-gray-700">
                Variant Results Preview
              </h2>

              <div className="overflow-auto max-h-80">
                <table className="min-w-full table-auto text-sm text-left text-gray-700">
                  <thead className="bg-gray-200 sticky top-0">
                    <tr>
                      {Object.keys(txtData[0]).map(key => (
                        <th key={key} className="px-4 py-2 text-sm font-medium border-b border-gray-300">
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txtData.slice(0, 10).map((row, i) => (
                      <tr
                        key={i}
                        className={`${
                          row['clinvar_20220320']?.toLowerCase().includes('pathogenic')
                            ? 'bg-red-50'
                            : i % 2 === 0
                            ? 'bg-white'
                            : 'bg-gray-50'
                        } hover:bg-gray-100`}
                      >
                        {Object.entries(row).map(([key, value]) => (
                          <td
                            key={key}
                            className="px-4 py-2 text-sm border-b border-gray-300"
                          >
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
            </div>

            {/* Graphs Section */}
            <div className="mt-10 space-y-12">

              {/* Bar: Variants per Gene */}
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-2">🧬 Variants Per Gene</h3>
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
                <h3 className="text-lg font-semibold mb-2">🧠 Variant Type Distribution</h3>
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
                <h3 className="text-lg font-semibold mb-2">🌍 gnomAD Population Frequencies</h3>
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
