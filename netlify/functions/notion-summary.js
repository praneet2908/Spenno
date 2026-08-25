// Queries the Notion database for this month's entries and returns total + list.
exports.handler = async (event) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    const notionRes = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: { property: 'Date', date: { on_or_after: monthStart } },
        sorts: [{ property: 'Date', direction: 'descending' }]
      })
    });

    const data = await notionRes.json();
    if (!notionRes.ok) {
      return { statusCode: notionRes.status, body: JSON.stringify({ error: data.message || 'Notion API error' }) };
    }

    const entries = data.results.map(page => ({
      name: page.properties.Name?.title?.[0]?.plain_text || 'Expense',
      amount: page.properties.Amount?.number || 0,
      category: page.properties.Category?.select?.name || 'Other',
      date: page.properties.Date?.date?.start || ''
    }));

    const total = entries.reduce((sum, e) => sum + e.amount, 0);

    return { statusCode: 200, body: JSON.stringify({ total, entries }) };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
