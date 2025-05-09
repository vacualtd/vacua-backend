import AWS from 'aws-sdk';
import sharp from 'sharp';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

export const uploadToS3 = async (file, folder = 'uploads/') => {
  try {
    const fileName = `${folder}${Date.now()}-${file.name}`;
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: file.data,
      ContentType: file.type,
      ACL: 'public-read'
    };

    const result = await s3.upload(params).promise();
    return {
      url: result.Location,
      key: result.Key
    };
  } catch (error) {
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

export const generateThumbnail = async (file) => {
  try {
    if (!file.type.startsWith('image/')) return null;

    const thumbnail = await sharp(file.data)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      data: thumbnail,
      name: `thumb-${file.name}`,
      type: 'image/jpeg'
    };
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return null;
  }
}; 