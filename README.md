# Neuron Node Builder

A Node-RED fork for machine-to-machine commerce powered by Hedera blockchain technology. This package provides custom nodes for buyers and sellers to interact with the Neuron network.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **Git**

**Note:** Node-RED is already included in this package, so no separate installation is required.

## Required Dependencies

This package requires two Go-based dependencies that must be compiled from source:

1. **neuron-go-hedera-sdk** - The Go Hedera SDK
2. **neuron-nodered-sdk-wrapper** - The Node-RED SDK wrapper

Both must be compiled for your specific platform and placed in the same directory.

### Supported Platforms

- **macOS** (Intel x64 and Apple Silicon ARM64)
- **Linux** (x64 and ARM64)
- **Windows** (x64)

## Installation & Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd neuron-green
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

### Step 3: Build Go Dependencies from Source

Follow the detailed instructions in the [Building Dependencies from Source](#building-dependencies-from-source) section below to compile the required Go dependencies.

### Step 4: Configure Environment Variables

A `.env` file is pre-filled with default values in the project root. **Do not change the pre-filled values.** You only need to update the following variables:

```bash
# Your Hedera Credentials (Required - obtain from neuron website)
HEDERA_OPERATOR_ID=0.0.XXXXXX
HEDERA_OPERATOR_KEY=3030020100300706052b8104000a04220420...
HEDERA_OPERATOR_EVM=0x1234567890abcdef...

# SDK Configuration (Required - path to compiled wrapper)
NEURON_SDK_PATH=/path/to/neuron-nodered-sdk-wrapper

# Optional: Logging Configuration
SDK_LOG_FOLDER=/path/to/logs
```

#### Important Notes:

1. **Hedera Credentials**: You must obtain `HEDERA_OPERATOR_ID`, `HEDERA_OPERATOR_KEY`, and `HEDERA_OPERATOR_EVM` by creating an account on the [Neuron website](https://neuron.com)
2. **NEURON_SDK_PATH**: Must point to the full path of `neuron-nodered-sdk-wrapper` executable you compiled
3. **SDK_LOG_FOLDER**: Optional. If not set, process logs will be suppressed
4. **Pre-filled Values**: All other values in the `.env` file are pre-configured and should not be changed

### Step 5: Build the neuron-registration Library

The package includes a submodule for the neuron-registration library. Build it:

```bash
cd neuron/nodes/neuron-registration
npm install
npm run build
cd ../../..
```

### Step 6: Start Neuron Green

Start Neuron Green with the custom settings:

```bash
npm run start
```


## Building Dependencies from Source

Follow these steps to compile the required Go dependencies from source:

### Prerequisites for Building

- **Go** (v1.19 or higher) - [Download from golang.org](https://golang.org/dl/)
- **Git**

### Step 1: Install Go

#### On macOS:
```bash
# Using Homebrew
brew install go

# Or download from golang.org
# Visit https://golang.org/dl/ and download the macOS installer
```

#### On Linux:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install golang-go

# CentOS/RHEL/Fedora
sudo yum install golang
# or
sudo dnf install golang
```

#### On Windows:
Download the installer from [golang.org/dl/](https://golang.org/dl/)

### Step 2: Verify Go Installation

```bash
go version
```

### Step 3: Clone and Build neuron-go-hedera-sdk

```bash
# Clone the repository
git clone https://github.com/NeuronInnovations/neuron-go-hedera-sdk.git
cd neuron-go-hedera-sdk

# Build for your platform
go build -o neuron-go-hedera-sdk

# For cross-platform builds, you can specify the target:
# macOS ARM64 (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o neuron-go-hedera-sdk-darwin-arm64

# macOS Intel
GOOS=darwin GOARCH=amd64 go build -o neuron-go-hedera-sdk-darwin-amd64

# Linux x64
GOOS=linux GOARCH=amd64 go build -o neuron-go-hedera-sdk-linux-amd64

# Linux ARM64
GOOS=linux GOARCH=arm64 go build -o neuron-go-hedera-sdk-linux-arm64

# Windows
GOOS=windows GOARCH=amd64 go build -o neuron-go-hedera-sdk.exe
```

### Step 4: Clone and Build neuron-nodered-sdk-wrapper

```bash
# Clone the repository
git clone https://github.com/NeuronInnovations/neuron-nodered-sdk-wrapper.git
cd neuron-nodered-sdk-wrapper

# Build for your platform
go build -o neuron-nodered-sdk-wrapper

# For cross-platform builds:
# macOS ARM64 (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o neuron-nodered-sdk-wrapper-darwin-arm64

# macOS Intel
GOOS=darwin GOARCH=amd64 go build -o neuron-nodered-sdk-wrapper-darwin-amd64

# Linux x64
GOOS=linux GOARCH=amd64 go build -o neuron-nodered-sdk-wrapper-linux-amd64

# Linux ARM64
GOOS=linux GOARCH=arm64 go build -o neuron-nodered-sdk-wrapper-linux-arm64

# Windows
GOOS=windows GOARCH=amd64 go build -o neuron-nodered-sdk-wrapper.exe
```

### Step 5: Place Compiled Binaries

Move both compiled executables to the same directory. For example, create a `bin` directory in your project:

```bash
# Create bin directory
mkdir -p bin

# Copy the compiled executables
cp ../neuron-go-hedera-sdk/neuron-go-hedera-sdk bin/
cp ../neuron-nodered-sdk-wrapper/neuron-nodered-sdk-wrapper bin/

# Make them executable (on Unix-like systems)
chmod +x bin/neuron-go-hedera-sdk
chmod +x bin/neuron-nodered-sdk-wrapper
```

### Step 6: Update Environment Configuration

Update your `.env` file to point to the compiled wrapper:

```bash
# SDK Configuration
NEURON_SDK_PATH=/path/to/your/project/bin/neuron-nodered-sdk-wrapper
```

**Important:** Make sure both `neuron-go-hedera-sdk` and `neuron-nodered-sdk-wrapper` are in the same directory, as the wrapper depends on the SDK.

## First-Time Setup

When you first start Neuron Green, you'll be automatically redirected to a setup wizard if your Hedera credentials are not configured. The wizard will:

1. Prompt you to enter your Hedera credentials
2. Save them to the `.env` file
3. Redirect you to the normal Neuron Green interface

## Using the Custom Nodes

### Buyer Node

The Buyer node allows you to:
- Create a buyer device on the Hedera network
- Connect to selected seller nodes
- Consume data from the Neuron network

**Configuration:**
- **Smart Contract**: Select the contract type (jetvision, chat, challenges)
- **Device Type**: Specify the type of device
- **Select Sellers**: Choose which seller nodes to connect to

### Seller Node

The Seller node allows you to:
- Create a seller device on the Hedera network
- Publish data to the network
- Connect to selected buyer nodes

**Configuration:**
- **Device Name**: Name of your seller device
- **Smart Contract**: Select the contract type
- **Device Role**: Role of the device
- **Serial Number**: Unique identifier
- **Device Type**: Type of device
- **Price**: Price for the service
- **Select Buyers**: Choose which buyer nodes to connect to



## Troubleshooting

### Common Issues

1. **"NEURON_SDK_PATH environment variable is not set"**
   - Ensure you've set the `NEURON_SDK_PATH` in your `.env` file
   - Make sure the path points to the correct executable

2. **"Executable not found"**
   - Verify the executable exists at the specified path
   - Ensure you downloaded the correct version for your platform
   - Check file permissions (should be executable)

3. **"Missing Hedera credentials"**
   - Complete the setup wizard when Node-RED starts
   - Or manually add your credentials to the `.env` file

4. **Process fails to start**
   - Check the console logs for error messages
   - Verify all environment variables are set correctly
   - Ensure the Go SDK dependencies are in the same directory

### Log Files

If `SDK_LOG_FOLDER` is set, check the log files for detailed error information:
- `buyer-{nodeId}-stdout.log` - Buyer process stdout
- `buyer-{nodeId}-stderr.log` - Buyer process stderr
- `seller-{nodeId}-stdout.log` - Seller process stdout
- `seller-{nodeId}-stderr.log` - Seller process stderr

