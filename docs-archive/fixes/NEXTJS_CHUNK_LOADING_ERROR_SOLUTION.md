# 🔧 Next.js Chunk Loading Error - Solution Guide

## 🚨 **Error Description**

```
Unhandled Runtime Error
ChunkLoadError: Loading chunk app/layout failed.
(timeout: http://localhost:3000/_next/static/chunks/app/layout.js)
```

## 🔍 **Root Cause Analysis**

This error typically occurs due to:

1. **Build cache corruption** - The `.next` directory has corrupted chunks
2. **Development server conflicts** - Multiple Node.js processes or hot reload issues
3. **File system changes** - Recent code changes causing chunk mismatches
4. **Memory issues** - Node.js processes consuming too much memory
5. **Port conflicts** - Another process using the same port

## 🛠️ **Step-by-Step Solution**

### **Step 1: Stop All Node.js Processes**

**Windows:**
```bash
taskkill /F /IM node.exe
```

**macOS/Linux:**
```bash
pkill -f node
```

### **Step 2: Clean Build Cache**

```bash
# Remove Next.js build cache
rmdir /s /q .next          # Windows
rm -rf .next                # macOS/Linux

# Remove TypeScript build info
del tsconfig.tsbuildinfo     # Windows
rm tsconfig.tsbuildinfo      # macOS/Linux

# Clear npm cache (optional)
npm cache clean --force
```

### **Step 3: Restart Development Server**

```bash
# Method 1: Standard restart
npm run dev

# Method 2: Use different port
npx next dev --port 3001

# Method 3: Force clean start
npm run build && npm run dev
```

### **Step 4: Alternative Solutions**

If the above doesn't work, try:

#### **A. Clear Node Modules (Nuclear Option)**
```bash
# Remove node_modules and reinstall
rmdir /s /q node_modules     # Windows
rm -rf node_modules          # macOS/Linux

npm install
```

#### **B. Check for TypeScript Errors**
```bash
npx tsc --noEmit
```

#### **C. Use Different Browser**
- Try opening in incognito/private mode
- Clear browser cache and cookies
- Try a different browser

#### **D. Check Environment Variables**
```bash
# Verify .env.local exists and has correct values
cat .env.local               # macOS/Linux
type .env.local              # Windows
```

## 🎯 **Quick Fix Commands**

**For Windows (PowerShell):**
```powershell
# Stop all Node processes
taskkill /F /IM node.exe

# Clean build cache
if (Test-Path .next) { Remove-Item .next -Recurse -Force }
if (Test-Path tsconfig.tsbuildinfo) { Remove-Item tsconfig.tsbuildinfo }

# Restart server
npm run dev
```

**For macOS/Linux:**
```bash
# Stop all Node processes
pkill -f node

# Clean build cache
rm -rf .next tsconfig.tsbuildinfo

# Restart server
npm run dev
```

## 🔍 **Troubleshooting Checklist**

- [ ] All Node.js processes stopped
- [ ] `.next` directory removed
- [ ] `tsconfig.tsbuildinfo` removed
- [ ] Port 3000 is free (check with `netstat -ano | findstr :3000`)
- [ ] No TypeScript compilation errors
- [ ] Environment variables are correct
- [ ] Browser cache cleared

## 🚀 **Prevention Tips**

1. **Regular Cache Cleaning**: Clean `.next` directory weekly during development
2. **Proper Server Shutdown**: Always use `Ctrl+C` to stop the dev server
3. **Memory Management**: Restart dev server if it consumes too much memory
4. **Code Changes**: After major code changes, restart the dev server
5. **Hot Reload Issues**: If hot reload stops working, restart the server

## 📊 **Success Indicators**

After applying the fix, you should see:

```
✓ Ready in 2.3s
✓ Local:        http://localhost:3000
✓ Network:      http://192.168.x.x:3000
```

And the application should load without chunk loading errors.

## 🆘 **If Nothing Works**

1. **Check Node.js Version**: Ensure you're using Node.js 18+ (recommended: 20+)
   ```bash
   node --version
   ```

2. **Reinstall Next.js**: 
   ```bash
   npm uninstall next
   npm install next@latest
   ```

3. **Create Fresh Project**: As a last resort, create a new Next.js project and migrate your code

4. **Check System Resources**: Ensure you have enough RAM and disk space

## 🔧 **Specific to AgentSalud MVP**

After fixing the chunk loading error, verify that:

- [ ] The date displacement fix is still working
- [ ] Weekly calendar component loads correctly
- [ ] Time slot headers show correct dates
- [ ] No regression in appointment booking flows

## 📝 **Post-Fix Validation**

1. Navigate to appointment booking
2. Select a date in the weekly calendar
3. Verify time slot header shows correct date
4. Test both new appointment and rescheduling flows

---

**Note**: The chunk loading error is a development environment issue and doesn't affect the production build. The date displacement fix we implemented is still valid and will work once the development server is running properly.
