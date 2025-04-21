// services/secureStore.js
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

class SecureStore {
  constructor() {
    this.storagePath = path.join(app.getPath("userData"), "secure-storage.dat");
    // Generate a machine-specific key
    this.key = crypto
      .createHash("sha256")
      .update(app.getPath("userData"))
      .digest("hex")
      .slice(0, 32);
  }

  // Save data securely
  save(data) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(this.key),
        iv
      );
      let encrypted = cipher.update(JSON.stringify(data));
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      fs.writeFileSync(
        this.storagePath,
        JSON.stringify({
          iv: iv.toString("hex"),
          data: encrypted.toString("hex"),
        })
      );

      return true;
    } catch (error) {
      console.error("Error saving secure data:", error);
      return false;
    }
  }

  // Load data securely
  load() {
    try {
      if (!fs.existsSync(this.storagePath)) {
        return null;
      }

      const fileData = JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
      const iv = Buffer.from(fileData.iv, "hex");
      const encryptedData = Buffer.from(fileData.data, "hex");

      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(this.key),
        iv
      );
      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return JSON.parse(decrypted.toString());
    } catch (error) {
      console.error("Error loading secure data:", error);
      return null;
    }
  }
  // Add these methods to your SecureStore class
  encrypt(data) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(this.key),
        iv
      );
      let encrypted = cipher.update(data);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      return {
        iv: iv.toString("hex"),
        data: encrypted.toString("hex"),
      };
    } catch (error) {
      console.error("Error encrypting data:", error);
      return null;
    }
  }

  decrypt(encryptedData) {
    try {
      const iv = Buffer.from(encryptedData.iv, "hex");
      const encrypted = Buffer.from(encryptedData.data, "hex");
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(this.key),
        iv
      );
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      console.error("Error decrypting data:", error);
      return null;
    }
  }
}

module.exports = new SecureStore();
