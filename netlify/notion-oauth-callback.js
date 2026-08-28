// Handles the redirect back from Notion after a user clicks "Connect with Notion."
// Exchanges the temporary code for a real access token, finds or creates the
// expense database in whatever page the user granted access to, then redirects
// back to the app with the credentials so the frontend can save them.
exports.handler = async (event) => {
  const code = event.queryStringParameters?.code;
  const siteUrl = `https://${event.headers.host}`;

  if (!code) {
    return { statusCode: 302, headers: { Location: `${siteUrl}/?oauth_error=missing_code` } };
  }

  try {
    // Step 1: exchange the code for an access token
    const basicAuth = Buffer.from(`${process.env.NOTION_OAUTH_CLIENT_ID}:${process.env.NOTION_OAUTH_CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${siteUrl}/.netlify/functions/notion-oauth-callback`
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('OAuth token exchange failed:', tokenData);
      return { statusCode: 302, headers: { Location: `${siteUrl}/?oauth_error=token_exchange` } };
    }
    const accessToken = tokenData.access_token;

    // Step 2: find a page the user granted access to, so we can create the database inside it
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filter: { property: 'object', value: 'page' }, page_size: 1 })
    });
    const searchData = await searchRes.json();
    const parentPage = searchData.results?.[0];

    if (!parentPage) {
      return { statusCode: 302, headers: { Location: `${siteUrl}/?oauth_error=no_page_access` } };
    }

    // Step 3: create the expenses database with the right schema, inside that page
    const dbRes = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { type: 'page_id', page_id: parentPage.id },
        title: [{ text: { content: 'Spenno Expenses' } }],
        properties: {
          'Name': { title: {} },
          'Amount': { number: {} },
          'Category': { multi_select: { options: [
            { name: 'Food' }, { name: 'Transport' }, { name: 'Shopping' },
            { name: 'Bills' }, { name: 'Other' }
          ] } },
          'Date': { date: {} }
        }
      })
    });
    const dbData = await dbRes.json();
    if (!dbRes.ok) {
      console.error('Database auto-create failed:', dbData);
      return { statusCode: 302, headers: { Location: `${siteUrl}/?oauth_error=db_create_failed` } };
    }

    // Step 4: redirect back to the app with the credentials in the URL hash
    // (hash, not query string, so it never gets logged server-side or sent to Netlify's servers)
    const redirectUrl = `${siteUrl}/#notion_token=${encodeURIComponent(accessToken)}&notion_db=${encodeURIComponent(dbData.id)}`;
    return { statusCode: 302, headers: { Location: redirectUrl } };
  } catch (err) {
    console.error('OAuth callback error:', err);
    return { statusCode: 302, headers: { Location: `${siteUrl}/?oauth_error=server_error` } };
  }
};