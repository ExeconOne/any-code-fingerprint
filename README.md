# APT Repository — acf

This branch is the APT repository for the `acf` CLI tool.
It is served via GitHub Pages and updated automatically on every release.

## Install

```bash
curl -fsSL https://ExeconOne.github.io/any-code-fingerprint/gpg.key \
  | sudo gpg --dearmor -o /usr/share/keyrings/execonone-acf.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/execonone-acf.gpg] \
https://ExeconOne.github.io/any-code-fingerprint stable main" \
  | sudo tee /etc/apt/sources.list.d/acf.list

sudo apt-get update
sudo apt-get install acf
```
