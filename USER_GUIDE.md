# Taste Signature - User Guide

## Quick Start

### Option 1: Load Sample Data (Fastest)

1. Open `index.html` in your web browser
2. Click "Import Data" in the left sidebar
3. Click "Load 15 Sample Concepts" button
4. Explore all features with pre-loaded TasteAI flavor concepts

### Option 2: Import Your Own Data

1. Open `index.html` in your web browser
2. Click "Import Data" in the left sidebar
3. Drag and drop a CSV or JSON file, or click "Choose Files"
4. Review the preview of mapped data
5. Click "Import" to add to your database

### Option 3: Manual Entry

1. Click "Log Experience" in the left sidebar
2. Fill out the 7-stage form
3. Submit to save your assessment

## Understanding the Taste Signature Framework

### The Five-Stage Journey

**Stage 1: Appearance**
- Visual appeal and color intensity
- First impressions before consumption
- Emotional: Anticipation and desire

**Stage 2: Aroma**
- Olfactory experience
- Complexity and intensity of smell
- Emotional: Pleasure and comfort

**Stage 3: Front of Mouth**
- Initial taste contact
- Sweet, sour, salty notes
- Texture impact
- Emotional: Excitement and satisfaction

**Stage 4: Mid/Rear Mouth**
- Developed flavors
- Bitterness, umami, richness
- Mouthfeel and creaminess
- Emotional: Indulgence and comfort

**Stage 5: Aftertaste**
- Post-consumption experience
- Duration and pleasantness
- Palate cleanness
- Emotional: Satisfaction and completeness

### Need States

Products are classified into one of four need states:

**Reward**
- Treating yourself
- Indulgent moments
- Personal pleasure
- Example: Dark chocolate, premium snacks

**Escape**
- Break from routine
- Relaxation and comfort
- Stress relief
- Example: Comfort foods, warm beverages

**Rejuvenation**
- Energy boost
- Refreshment
- Revitalization
- Example: Citrus drinks, mint products

**Sociability**
- Sharing moments
- Social connection
- Bringing people together
- Example: Party snacks, shareable treats

### Emotional Triggers

Four key triggers that drive repeat consumption:

**Moreishness (0-10)**
- How much you want to keep eating/drinking
- Addictive quality
- High = Can't stop at one

**Refreshment (0-10)**
- Cleansing, revitalizing effect
- Palate clarity
- High = Leaves you feeling refreshed

**The Melt (0-10)**
- Smooth, dissolving sensation
- Comforting texture
- High = Luxurious mouthfeel

**Texture/Crunch (0-10)**
- Satisfying textural experience
- Physical feedback
- High = Engaging to eat

## Using the Dashboard

### Overview Page

**Statistics Cards**
- Total Experiences: Count of logged products
- Products Analyzed: Unique product names
- Average Satisfaction: Mean aftertaste satisfaction score
- Top Need State: Most common classification

**Recent Activity**
- Last 5 logged experiences
- Quick access to product names and dates

**Quick Insights**
- Top rated product
- Dominant need state
- Key patterns

### Shape of Taste Analysis

1. Select a product from dropdown
2. View intensity curve across 5 stages
3. See emotional journey graph below
4. Identify peak moments and patterns

**Interpreting the Curve:**
- Upward slope = Building intensity
- Peak = Maximum impact moment
- Downward slope = Fading experience
- Flat line = Consistent throughout

### Need States & Triggers

**Distribution Chart**
- Pie chart showing need state breakdown
- Identifies portfolio balance
- Reveals consumer occasion focus

**Triggers Analysis**
- Bar chart of average trigger scores
- Identifies dominant drivers
- Highlights product strengths

### Product Comparison

1. Select 2-4 products (checkboxes)
2. Click "Run Comparison"
3. View overlaid intensity curves
4. Compare need states and triggers
5. Identify differentiation opportunities

**Best For:**
- Portfolio analysis
- Competitive benchmarking
- Product positioning
- Identifying white space

### Professional Insights

Auto-generated insights include:
- Portfolio overview
- Need state focus
- Emotional driver analysis
- Journey patterns
- Top performers

Use these for:
- Executive summaries
- Brand strategy
- Innovation priorities
- Marketing messaging

## Data Import Deep Dive

### Automatic Mapping Logic

The system uses intelligent algorithms to map flavor concepts:

**Taste Profile Keywords:**
- "sweet" → High front intensity, moderate mid
- "spicy" → Building curve from aroma to aftertaste
- "bitter" → Low front, high mid/rear
- "creamy" → High melt trigger
- "crunchy" → High texture trigger
- "refreshing" → High refreshment trigger
- "citrus/citrusy" → High front and refreshment

**Emotional Resonance Keywords:**
- "excitement/adventure" → Reward need state, high moreishness
- "comfort/warmth" → Escape need state, high melt
- "freshness/energizing" → Rejuvenation, high refreshment
- "joy" → Sociability, balanced triggers
- "indulgence/luxury" → Reward, high melt
- "nostalgia" → Escape, high moreishness

**Category Mapping:**
- Snack → Typically reward/escape
- Beverage → Often rejuvenation
- Dessert → Usually reward
- Confectionery → Primarily reward

### Creating Import Files

**CSV Format:**
```csv
Concept_ID,Flavor_Name,Primary_Ingredients,Taste_Profile,Emotional_Resonance,Target_Product_Category,Market_Trend_Alignment
1,Tropical Delight,"Mango, Passion Fruit","Sweet, tangy","Excitement, Joy",Beverage,Growing tropical trend
```

**JSON Format:**
```json
[
  {
    "Concept_ID": "1",
    "Flavor_Name": "Tropical Delight",
    "Primary_Ingredients": "Mango, Passion Fruit",
    "Taste_Profile": "Sweet, tangy",
    "Emotional_Resonance": "Excitement, Joy",
    "Target_Product_Category": "Beverage",
    "Market_Trend_Alignment": "Growing tropical trend"
  }
]
```

**Tips:**
- Use descriptive flavor names
- List 2-4 primary ingredients
- Use comma-separated taste descriptors
- List 1-2 emotional resonances
- Keep categories consistent
- Market trend is optional but valuable

### Excel to CSV Conversion

If you have Excel files:

**Method 1: Excel Save As**
1. Open Excel file
2. File → Save As
3. Format: CSV UTF-8
4. Save and import

**Method 2: Google Sheets**
1. Upload to Google Sheets
2. File → Download → CSV
3. Import to Taste Signature

## Best Practices

### For Brand Managers

**Portfolio Review**
1. Import all SKUs
2. Review need state distribution
3. Identify gaps in emotional territory
4. Compare trigger profiles

**Competitive Analysis**
1. Log competitor products
2. Use comparison tool
3. Identify differentiation opportunities
4. Map white space

**Innovation Pipeline**
1. Import flavor concepts
2. Review predicted need states
3. Check trigger alignment with goals
4. Prioritize based on insights

### For Product Developers

**Concept Testing**
1. Create detailed assessments
2. Track journey patterns
3. Optimize peak moments
4. Balance emotional triggers

**Reformulation**
1. Log current version
2. Log new version
3. Compare side-by-side
4. Measure improvement

**Sensory Optimization**
1. Track intensity curves
2. Identify desired peaks
3. Adjust formulation
4. Re-test and compare

### For Researchers

**Study Design**
1. Standardize assessment protocol
2. Use consistent scales
3. Train panelists on stages
4. Log all data

**Data Analysis**
1. Export full dataset
2. Analyze correlations
3. Identify patterns
4. Generate insights

**Reporting**
1. Use comparison charts
2. Export visualizations
3. Include shape of taste graphs
4. Highlight key findings

## Troubleshooting

### Import Issues

**"No valid data found"**
- Check file format (CSV or JSON)
- Verify column headers match template
- Ensure no blank rows
- Check for special characters

**Incorrect Mapping**
- Review taste profile keywords
- Check emotional resonance terms
- Verify category names
- Use standard terminology

### Browser Issues

**Data Not Saving**
- Check localStorage is enabled
- Try different browser
- Clear cache and reload
- Export data as backup

**Charts Not Showing**
- Ensure JavaScript is enabled
- Check internet connection (for Chart.js CDN)
- Try refreshing page
- Check browser console for errors

### Performance Issues

**Slow Loading**
- Limit to <100 experiences
- Export old data
- Clear browser cache
- Use modern browser

## Data Management

### Exporting Data

1. Click "Export Data" in top bar
2. JSON file downloads automatically
3. Save to secure location
4. Filename includes date

### Backing Up

**Recommended Schedule:**
- Weekly exports for active projects
- Monthly exports for portfolios
- Before major imports
- After significant analysis

### Clearing Data

**Warning:** This cannot be undone!

1. Go to History section
2. Click "Clear All Data"
3. Confirm deletion
4. All experiences removed

**Best Practice:** Always export before clearing

## Advanced Features

### Custom Analysis

Export data and use external tools:
- Excel for pivot tables
- R/Python for statistical analysis
- Tableau for advanced visualization
- PowerBI for dashboards

### Integration Opportunities

The JSON export format enables:
- Database imports
- API integrations
- Automated reporting
- Custom dashboards

## Support

For questions, issues, or feature requests:
- Review this guide
- Check README.md for technical details
- Examine sample data for examples
- Export and analyze data externally if needed

## Appendix: Keyboard Shortcuts

- **Tab**: Navigate form fields
- **Enter**: Submit form (when on submit button)
- **Escape**: Cancel import preview
- **Arrow Keys**: Adjust sliders

## Appendix: Data Fields Reference

### Product Info Fields
- **Product Name**: Full product name
- **Brand**: Manufacturer or brand name
- **Category**: Type of product
- **Variant**: Flavor or sub-type

### Sensory Fields
- All rated 0-10
- 0 = Absent/Very low
- 5 = Moderate
- 10 = Very high/Intense

### Emotional Fields
- All rated 0-10
- 0 = Not at all
- 5 = Moderately
- 10 = Extremely

### Need States
- Reward, Escape, Rejuvenation, Sociability
- Select ONE primary need state
- Based on dominant emotional driver

### Triggers
- Moreishness: Desire to continue
- Refreshment: Cleansing quality
- The Melt: Smooth sensation
- Texture/Crunch: Physical satisfaction

---

**Version:** 1.0
**Last Updated:** October 2025
**Platform:** Taste Signature Professional Edition
