// functions/index.js
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

// Set up your email transport using your email provider's credentials
// For example, using Gmail:
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'jorgeherter@gmail.com',
        pass: 'SanMiguel_2014'
    }
});

exports.sendShareEmail = functions.https.onCall(async (data, context) => {
    const { targetEmail, senderName, publicLists, userExists } = data;

    // Construct the email content
    let emailSubject = userExists
        ? `Your Public Shopping Lists`
        : `You've Been Invited to Join Our Shopping App`;

    let emailBody = `
        <h1>${emailSubject}</h1>
        <p>Hi there,</p>
        <p>${senderName} has shared their public shopping lists with you.</p>
    `;

    if (publicLists.length > 0) {
        emailBody += `<h2>Public Lists:</h2><ul>`;
        publicLists.forEach(list => {
            emailBody += `<li>${list.name}</li>`;
        });
        emailBody += `</ul>`;
    }

    emailBody += `
        <p>Thank you for using our app!</p>
    `;

    // Send the email
    try {
        await transporter.sendMail({
            from: 'your_email@gmail.com',
            to: targetEmail,
            subject: emailSubject,
            html: emailBody
        });
        console.log(`Email sent to ${targetEmail}`);
    } catch (error) {
        console.error("Error sending email:", error);
        throw new functions.https.HttpsError('internal', 'Failed to send email');
    }
});