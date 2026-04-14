'use client'

export function RoadmapWindow() {
  const roadmapItems = [
    { votes: 603, team: 'Not assigned', idea: 'Product tours', details: 'We have a in-app surveys product that allows our customers to show a survey...' },
    { votes: 288, team: 'Blitzscale', idea: 'Embedded analytics (B2B2B/B2B2C)', details: 'Ability to show OpenHog data/graphs to end users' },
    { votes: 161, team: 'Web Analytics', idea: 'Cookie banner product', details: 'We want some "just use this" way of displaying cookie banners that would le...' },
    { votes: 146, team: 'Surveys', idea: 'Surveys in emails', details: 'Add ability to send surveys in emails and collect responses via interactions in the email' },
    { votes: 135, team: 'Not assigned', idea: 'Logs product', details: 'Basics: - Log Collection: Capture logs from web apps or other digital t...' },
    { votes: 112, team: 'Not assigned', idea: 'Product roadmaps', details: 'Very much a rough idea... We have a really wide variety of features we cou...' },
    { votes: 97, team: 'Feature Flags', idea: 'Event-based flag targeting', details: 'Being able to release feature flags based on events triggered, as being part of a...' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center gap-4">
        <button className="px-3 py-1 hover:bg-gray-200 rounded">Zoom</button>
        <div className="flex gap-1">
          <button className="px-2 py-1 hover:bg-gray-200 rounded font-bold">B</button>
          <button className="px-2 py-1 hover:bg-gray-200 rounded italic">I</button>
          <button className="px-2 py-1 hover:bg-gray-200 rounded underline">U</button>
        </div>
        <button className="px-3 py-1 hover:bg-gray-200 rounded">Font</button>
        <div className="ml-auto">
          <button className="bg-[#fbbf24] hover:bg-[#f59e0b] text-gray-900 font-semibold px-4 py-1 rounded">
            Share
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex gap-6 text-sm">
        {['About', 'Roadmap', 'Changelog', 'People', 'Teams', 'Handbook', 'Blog', 'Media', 'Careers'].map((item) => (
          <button key={item} className={`hover:text-gray-600 ${item === 'Roadmap' ? 'font-semibold border-b-2 border-gray-800' : ''}`}>
            {item}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Roadmap</h1>
          <p className="text-gray-700 mb-6">
            {"Here's"} what {"we're"} thinking about building next. If you want to see what {"we've"} shipped recently,{' '}
            <a href="#" className="underline font-semibold">visit the changelog</a>.
          </p>

          {/* Roadmap Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Votes</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Team</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Idea</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roadmapItems.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <button className="bg-[#fbbf24] hover:bg-[#f59e0b] px-3 py-1 rounded text-sm font-semibold flex items-center gap-1">
                        👍 Vote
                      </button>
                      <div className="text-sm text-gray-600 mt-1">{item.votes} votes</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {item.team === 'Not assigned' ? (
                        <span className="italic">{item.team}</span>
                      ) : (
                        <span className="font-semibold underline">{item.team}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-800">{item.idea}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {item.details}
                      {item.details.endsWith('...') && (
                        <button className="text-orange-600 font-semibold ml-1">Show more</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
