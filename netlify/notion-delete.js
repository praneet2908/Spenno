// Notion's API doesn't support permanent deletion via API - archiving a page
// is the correct equivalent (it disappears from the database view).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { pageId } = JSON.parse(event.body);
    if (!pageId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'pageId required' }) };
    }

    const notionRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ archived: true })
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