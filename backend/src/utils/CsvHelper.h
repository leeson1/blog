#pragma once
#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <mutex>

namespace CsvHelper {

// Parse a single CSV line, handling quoted fields
inline std::vector<std::string> parseCsvLine(const std::string& line) {
    std::vector<std::string> fields;
    std::string field;
    bool inQuotes = false;
    size_t i = 0;

    while (i < line.size()) {
        char c = line[i];
        if (inQuotes) {
            if (c == '"') {
                // Check for escaped double quote
                if (i + 1 < line.size() && line[i + 1] == '"') {
                    field += '"';
                    i += 2;
                } else {
                    // End of quoted field
                    inQuotes = false;
                    i++;
                }
            } else {
                field += c;
                i++;
            }
        } else {
            if (c == '"') {
                inQuotes = true;
                i++;
            } else if (c == ',') {
                fields.push_back(field);
                field.clear();
                i++;
            } else if (c == '\r') {
                // Skip carriage return
                i++;
            } else {
                field += c;
                i++;
            }
        }
    }
    fields.push_back(field);
    return fields;
}

// Read entire CSV file, returning rows of fields (including header)
inline std::vector<std::vector<std::string>> readCsv(const std::string& path) {
    std::vector<std::vector<std::string>> result;
    std::ifstream file(path);
    if (!file.is_open()) {
        return result;
    }

    std::string line;
    std::string accumulated;
    bool inQuotes = false;

    while (std::getline(file, line)) {
        // Count unescaped quotes to track if we're inside a quoted field
        accumulated += line;

        // Check if we're still inside a quoted field
        int quoteCount = 0;
        bool escaping = false;
        for (size_t i = 0; i < accumulated.size(); i++) {
            if (accumulated[i] == '"') {
                if (escaping) {
                    escaping = false;
                } else if (i + 1 < accumulated.size() && accumulated[i + 1] == '"') {
                    escaping = true;
                } else {
                    quoteCount++;
                }
            }
        }

        // If odd number of quotes, we're inside a quoted field - need more lines
        if (quoteCount % 2 != 0) {
            accumulated += '\n';
            continue;
        }

        result.push_back(parseCsvLine(accumulated));
        accumulated.clear();
    }

    if (!accumulated.empty()) {
        result.push_back(parseCsvLine(accumulated));
    }

    return result;
}

// Escape a field for CSV output
inline std::string escapeCsvField(const std::string& field) {
    // Check if quoting is needed
    bool needsQuoting = false;
    for (char c : field) {
        if (c == ',' || c == '"' || c == '\n' || c == '\r') {
            needsQuoting = true;
            break;
        }
    }

    if (!needsQuoting) {
        return field;
    }

    std::string result = "\"";
    for (char c : field) {
        if (c == '"') {
            result += "\"\"";
        } else {
            result += c;
        }
    }
    result += '"';
    return result;
}

// Write entire CSV file
inline void writeCsv(const std::string& path, const std::vector<std::vector<std::string>>& data) {
    std::ofstream file(path, std::ios::trunc);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open file for writing: " + path);
    }

    for (const auto& row : data) {
        for (size_t i = 0; i < row.size(); i++) {
            if (i > 0) file << ',';
            file << escapeCsvField(row[i]);
        }
        file << '\n';
    }
}

// Append a single row to CSV
inline void appendCsvRow(const std::string& path, const std::vector<std::string>& row) {
    std::ofstream file(path, std::ios::app);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open file for appending: " + path);
    }

    for (size_t i = 0; i < row.size(); i++) {
        if (i > 0) file << ',';
        file << escapeCsvField(row[i]);
    }
    file << '\n';
}

} // namespace CsvHelper
