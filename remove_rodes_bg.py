import sys
try:
    from PIL import Image
    
    def remove_background(img_path, out_path, threshold=40):
        img = Image.open(img_path).convert("RGBA")
        data = img.getdata()
        bg_color = data[0] # top left pixel
        
        new_data = []
        for item in data:
            if abs(item[0] - bg_color[0]) < threshold and \
               abs(item[1] - bg_color[1]) < threshold and \
               abs(item[2] - bg_color[2]) < threshold:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
                
        img.putdata(new_data)
        img.save(out_path, "PNG")
        print(f"Processed {img_path}")

    remove_background("public/rodes-logo.png", "public/rodes-logo.png")
except Exception as e:
    print(f"Error: {e}")
