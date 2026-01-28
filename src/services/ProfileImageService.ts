import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

export class ProfileImageService {
  private static readonly BUCKET_NAME = 'profile-images';
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

  /**
   * Validates an image file for upload
   */
  static validateFile(file: File): ImageValidationResult {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: 'Arquivo muito grande. Máximo 5MB permitido.'
      };
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Apenas arquivos JPEG, PNG e WebP são permitidos.'
      };
    }

    // Check file extension as additional validation
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!this.ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        isValid: false,
        error: 'Extensão de arquivo não permitida.'
      };
    }

    return { isValid: true };
  }

  /**
   * Uploads a profile image to Supabase Storage
   */
  static async uploadImage(file: File, userId: string): Promise<ImageUploadResult> {
    try {
      // Validate file first
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Generate unique filename with user ID folder structure
      const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
      const fileName = `${userId}/avatar${fileExtension}`;

      // Upload to Supabase Storage
      const { data: _data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Replace existing file
        });

      if (error) {
        logger.error('Storage upload error:', error);
        return {
          success: false,
          error: 'Erro no upload. Tente novamente.'
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        return {
          success: false,
          error: 'Erro ao gerar URL da imagem.'
        };
      }

      return {
        success: true,
        url: urlData.publicUrl
      };
    } catch (error) {
      logger.error('Image upload error:', error);
      return {
        success: false,
        error: 'Erro inesperado no upload.'
      };
    }
  }

  /**
   * Deletes a profile image from Supabase Storage
   */
  static async deleteImage(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // List all files in user's folder to find the current avatar
      const { data: files, error: listError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(userId);

      if (listError) {
        logger.error('Error listing files:', listError);
        return {
          success: false,
          error: 'Erro ao listar arquivos.'
        };
      }

      if (!files || files.length === 0) {
        // No files to delete
        return { success: true };
      }

      // Delete all files in user's folder (should typically be just one avatar)
      const filePaths = files.map(file => `${userId}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove(filePaths);

      if (deleteError) {
        logger.error('Error deleting files:', deleteError);
        return {
          success: false,
          error: 'Erro ao deletar imagem.'
        };
      }

      return { success: true };
    } catch (error) {
      logger.error('Image deletion error:', error);
      return {
        success: false,
        error: 'Erro inesperado ao deletar imagem.'
      };
    }
  }

  /**
   * Gets the public URL for a user's profile image
   */
  static getImageUrl(userId: string, fileName: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(`${userId}/${fileName}`);

    return data.publicUrl;
  }

  /**
   * Generates user initials for default avatar
   */
  static generateUserInitials(name?: string, email?: string): string {
    if (name) {
      const nameParts = name
        .split(' ')
        .map(part => part.trim())
        .filter(part => part.length > 0); // Remove empty parts
      
      if (nameParts.length >= 2) {
        // Take first letter of first and last name parts
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
      } else if (nameParts.length === 1) {
        // Single name, take first letter
        return nameParts[0].charAt(0).toUpperCase();
      }
    }

    if (email) {
      return email.charAt(0).toUpperCase();
    }

    return 'U';
  }

  /**
   * Creates a data URL for file preview
   */
  static createPreviewUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Checks if the storage bucket exists and is accessible
   */
  static async checkBucketAccess(): Promise<{ accessible: boolean; error?: string }> {
    try {
      const { data: _data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1 });

      if (error) {
        logger.error('Bucket access error:', error);
        return {
          accessible: false,
          error: 'Bucket não acessível.'
        };
      }

      return { accessible: true };
    } catch (error) {
      logger.error('Bucket check error:', error);
      return {
        accessible: false,
        error: 'Erro ao verificar bucket.'
      };
    }
  }
}