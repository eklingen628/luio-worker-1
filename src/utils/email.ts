import nodemailer from 'nodemailer'
import { splitData } from './scope';
import path from 'path';
import fs from 'fs';
import { getDateString } from './date';

console.log("START OF EMAIL.TS")

type EmailOptions = {
    from: string;
    to: string;
    subject: string;
    text: string;
    attachments: {
        filename: string;
        path: string;
    }[];
}

export const emailToFromSelf = {
    from: process.env.EMAIL_USER ?? '',
    to: process.env.EMAIL_USER ?? '',
}

export const scopeEmail: EmailOptions = {
    ...emailToFromSelf,
    subject: 'AUTOMATED EMAIL -- USER MISSING REQUIRED SCOPES',
    text: `One or more users is missing the required scopes: \n\n${splitData(process.env.SCOPES_NEEDED ?? '').join('\n')}\n\nPlease check the application's logs to determine which user, and have the user re-log in to provde access to needed scopes.`,
    attachments: []
}


//need to update the language of this more
export const notWearingDevice: EmailOptions = {
    ...emailToFromSelf,
    subject: 'AUTOMATED EMAIL -- USER NOT WEARING DEVICE',
    text: `One or more users is not wearing their device. Please check the application's logs to determine which user.`,
    attachments: []
}


export const dataDump: EmailOptions = {
    to: process.env.EMAIL_USER ?? '',
    from: process.env.EMAIL_USER ?? '',
    subject: `AUTOMATED EMAIL -- DATA DUMP ${getDateString(new Date())}`,
    text: `Data dump for the day.`,
    attachments: []
}



export const errorEmail: EmailOptions = {
    ...emailToFromSelf,
    subject: `AUTOMATED EMAIL -- ERROR`,
    text: `Default email text`,
    attachments: []
}


const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const parentDir = process.env.DATA_DUMP_DIR!;




export async function getFileDump() {
    console.trace('getFileDump called');

    try {
        const currentDir = path.join(parentDir,`dump_${getDateString(new Date())}`);
        //check if the directory exists
        if (!fs.existsSync(currentDir)) {
            console.log('No file dump found for directory: ', currentDir);
            throw new Error('No file dump found for directory: ' + currentDir);
        }
        const fullFilePaths = fs.readdirSync(currentDir).map(file => path.join(currentDir, file));
        return fullFilePaths;
    } catch (error) {
        throw error;
    }
}



async function sendErrorEmail(emailOptions: EmailOptions) {
    try {
        return await transporter.sendMail(emailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

export async function sendEmail(emailOptions: EmailOptions) {
    try {
        // Handle data dump emails with file attachments
        if (emailOptions.subject.includes("AUTOMATED EMAIL -- DATA DUMP") && !emailOptions.subject.includes("ERROR")) {
            try {
                const files = await getFileDump();
                emailOptions.attachments = files.map(file => ({
                    filename: path.basename(file),
                    path: file,
                }));
            } catch (error) {
                const newErrorEmail = errorEmail;
                newErrorEmail.text = `Error getting file dump: ${error}`;

                console.error('Error getting file dump:', error);
                // Send error email instead
                return await sendErrorEmail(newErrorEmail);
            }
        }

        return await transporter.sendMail(emailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}



