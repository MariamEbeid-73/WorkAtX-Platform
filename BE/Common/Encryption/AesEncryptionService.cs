using System.Security.Cryptography;
using System.Text;

namespace BE.Common.Encryption;

/// <summary>
/// AES-256-CBC encryption with a random IV prepended to the ciphertext.
/// The key is read from config as a base64-encoded 32-byte string.
/// </summary>
public class AesEncryptionService : IAesEncryptionService
{
    private readonly byte[] _key;

    public AesEncryptionService(IConfiguration configuration)
    {
        var keyBase64 = configuration["Encryption:Key"]
            ?? configuration["Encryption__Key"]
            ?? throw new InvalidOperationException("Encryption:Key is not configured.");

        // Clean whitespace, carriage returns (\r), or newlines (\n)
        keyBase64 = keyBase64.Trim().Replace("\r", "").Replace("\n", "");

        try
        {
            _key = Convert.FromBase64String(keyBase64);
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException(
                $"Failed to parse Encryption:Key as Base64. Raw value length was {keyBase64.Length}. Value: '{keyBase64}'", ex);
        }

        if (_key.Length != 32)
            throw new InvalidOperationException($"Encryption:Key must be exactly 32 bytes (256 bits). Got {_key.Length} bytes.");
    }

    public string Encrypt(string plaintext)
    {
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV(); // random IV per encryption

        using var encryptor = aes.CreateEncryptor();
        var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        var ciphertextBytes = encryptor.TransformFinalBlock(plaintextBytes, 0, plaintextBytes.Length);

        // Prepend the 16-byte IV so we can recover it during decryption
        var result = new byte[aes.IV.Length + ciphertextBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(ciphertextBytes, 0, result, aes.IV.Length, ciphertextBytes.Length);

        return Convert.ToBase64String(result);
    }

    public string Decrypt(string ciphertext)
    {
        var fullBytes = Convert.FromBase64String(ciphertext);

        using var aes = Aes.Create();
        aes.Key = _key;

        // Extract the IV from the first 16 bytes
        var iv = new byte[16];
        var ciphertextBytes = new byte[fullBytes.Length - 16];
        Buffer.BlockCopy(fullBytes, 0, iv, 0, 16);
        Buffer.BlockCopy(fullBytes, 16, ciphertextBytes, 0, ciphertextBytes.Length);
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor();
        var plaintextBytes = decryptor.TransformFinalBlock(ciphertextBytes, 0, ciphertextBytes.Length);
        return Encoding.UTF8.GetString(plaintextBytes);
    }
}
