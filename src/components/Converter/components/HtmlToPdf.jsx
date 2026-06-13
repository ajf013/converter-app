import React, { useState } from 'react';
import { Icon, Button, Header as SemanticHeader, Form, TextArea } from 'semantic-ui-react';
import { saveAs } from 'file-saver';
import { motion } from 'framer-motion';
import { convertHtmlToPDF } from '../../../utils/conversionUtils';
import { shareFile } from '../../../utils/shareUtils';
import { addHistoryEntry } from '../../../utils/historyUtils';

const defaultHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
  <h1 style="color: #2b6cb0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; text-align: center;">INVOICE</h1>
  <div style="display: flex; justify-content: space-between; margin-top: 20px;">
    <div>
      <strong>From:</strong><br>
      ConverterApp Inc.<br>
      123 Tech Avenue, Suite 100<br>
      Silicon Valley, CA
    </div>
    <div style="text-align: right;">
      <strong>Invoice No:</strong> #CA-2026-001<br>
      <strong>Date:</strong> June 8, 2026<br>
      <strong>Due Date:</strong> July 8, 2026
    </div>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
    <thead>
      <tr style="background-color: #f7fafc; border-bottom: 2px solid #cbd5e0;">
        <th style="text-align: left; padding: 10px;">Item Description</th>
        <th style="text-align: right; padding: 10px;">Qty</th>
        <th style="text-align: right; padding: 10px;">Price</th>
        <th style="text-align: right; padding: 10px;">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px;">Premium PDF Utilities Subscription</td>
        <td style="text-align: right; padding: 10px;">1</td>
        <td style="text-align: right; padding: 10px;">$49.00</td>
        <td style="text-align: right; padding: 10px;">$49.00</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px;">Advanced Encryption Suite Addon</td>
        <td style="text-align: right; padding: 10px;">1</td>
        <td style="text-align: right; padding: 10px;">$15.00</td>
        <td style="text-align: right; padding: 10px;">$15.00</td>
      </tr>
    </tbody>
  </table>
  <div style="text-align: right; margin-top: 30px; font-size: 1.2rem;">
    <strong>Total Due: <span style="color: #2b6cb0;">$64.00</span></strong>
  </div>
</div>`;

const HtmlToPdf = () => {
    const [htmlContent, setHtmlContent] = useState(defaultHtml);
    const [processing, setProcessing] = useState(false);
    const [resultBlob, setResultBlob] = useState(null);

    const handleConvert = async () => {
        if (!htmlContent.trim()) {
            alert('Please provide HTML content to convert.');
            return;
        }
        setProcessing(true);
        try {
            const blob = await convertHtmlToPDF(htmlContent);
            setResultBlob(blob);
            addHistoryEntry(`html_document_${Date.now()}.pdf`, 'HTML to PDF', 'Success');
        } catch (err) {
            console.error(err);
            alert('Error converting HTML to PDF. Ensure your HTML tags are closed and valid.');
            addHistoryEntry('HTML to PDF Operation', 'HTML to PDF', 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleShare = async () => {
        if (!resultBlob) return;
        const fileName = `html_document_${Date.now()}.pdf`;
        const shared = await shareFile(resultBlob, fileName, 'application/pdf');
        if (!shared) {
            saveAs(resultBlob, fileName);
        }
    };

    return (
        <motion.div
            className="converter-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ maxWidth: '560px', width: '100%' }}
        >
            <div className="icon-wrapper" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                <Icon name='html5' size='huge' style={{ color: 'white' }} />
            </div>
            <SemanticHeader as='h2' style={{ color: 'white' }}>HTML to PDF</SemanticHeader>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Paste or design custom HTML templates and render them into downloadable PDF pages.
            </p>

            <Form style={{ width: '100%', marginBottom: '20px', textAlign: 'left' }}>
                <label style={{ color: 'white', fontSize: '0.85rem', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    HTML Source Code:
                </label>
                <TextArea 
                    placeholder="Enter HTML content..." 
                    value={htmlContent}
                    onChange={(e, { value }) => { setHtmlContent(value); setResultBlob(null); }}
                    rows={10}
                    style={{ 
                        background: 'rgba(0,0,0,0.3)', 
                        color: 'white', 
                        fontFamily: 'monospace', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '10px',
                        padding: '12px' 
                    }}
                />
            </Form>

            <div className="controls">
                <Button 
                    primary 
                    onClick={handleConvert} 
                    loading={processing}
                    style={{ width: '100%', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}
                >
                    Render to PDF
                </Button>
            </div>

            {resultBlob && (
                <div className="result-area">
                    <Icon name="check circle" color="green" size="large" />
                    <Button color="green" size="small" onClick={() => saveAs(resultBlob, `html_render_${Date.now()}.pdf`)}>Download</Button>
                    <Button color="blue" size="small" onClick={handleShare}><Icon name="share alternate" /> Share</Button>
                </div>
            )}
        </motion.div>
    );
};

export default HtmlToPdf;
