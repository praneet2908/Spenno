exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { pageId, amount, category, note } = JSON.parse(event.body);
    if (!pageId || !amount || isNaN(amount)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'pageId and valid amount required' }) };
    }

    const notionRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          'Name': { title: [{ text: { content: note || category || 'Expense' } }] },
          'Amount': { number: parseFloat(amount) },
          'Category': { multi_select: [{ name: category || 'Other' }] }
        }
      })
    });

    const data = await notionRes.json();
    if (!notionRes.ok) {
      return { statusCode: notionRes.status, body: JSON.stringify({ error: data.message || 'Notion API error' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};