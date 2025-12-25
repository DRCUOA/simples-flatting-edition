// category-assignment-controller.js
const keywordCatMapDao = require('../models/keyword_category_map_dao');

// In your controller file
exports.searchKeywordsForCategory = async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  try {
    const row = await keywordCatMapDao.findMatchingCategory(keyword);
    if (!row) {
      return res.status(200).json({ category_id: '0', category_name: 'No Category Found' });
    }
    res.json({ category_id: row.category_id, category_name: row.category_name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to find matching category' });
  }
};