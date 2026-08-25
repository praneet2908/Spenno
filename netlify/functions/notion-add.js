// Adds one expense as a page in the user's Notion database.
// Requires env vars: NOTION_TOKEN (internal integration secret), NOTION_DATABASE_ID
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { amount, category, note } = JSON.parse(event.body);

    if (!amount || isNaN(amount)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Valid amount required' }) };
    }

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties: {
          'Name': { title: [{ text: { content: note || category || 'Expense' } }] },
          'Amount': { number: parseFloat(amount) },
          'Category': { select: { name: category || 'Other' } },
          'Date': { date: { start: new Date().toISOString().slice(0, 10) } }
        }
      })
    });

    const data = await notionRes.json();

    if (!notionRes.ok) {
      console.error('Notion API error:', data);
      return { statusCode: notionRes.status, body: JSON.stringify({ error: data.message || 'Notion API error' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, id: data.id }) };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
