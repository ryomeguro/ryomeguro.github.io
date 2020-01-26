import numpy as np
import cv2
import sys

TARGETWIDTH = 500
TARGETHEIGHT = 300

def resize(inputpath, outputpath):
    targetRatio = TARGETHEIGHT / TARGETWIDTH

    img = cv2.imread(inputpath,cv2.IMREAD_COLOR)
    height, width, channels = img.shape[:3]
    ratio = height / width

    firstHeight = TARGETHEIGHT
    firstWidth = TARGETWIDTH

    isCutHeight = True

    if ratio >= targetRatio:
        firstHeight = int(height * TARGETWIDTH / width)
    else:
        firstWidth = int(width * TARGETHEIGHT / height)
        isCutHeight = False

    img = cv2.resize(img,(firstWidth, firstHeight))

    if isCutHeight :
        cut = int((firstHeight - TARGETHEIGHT) / 2)
        img = img[cut : cut + TARGETHEIGHT, 0 : TARGETWIDTH - 1]
    else :
        cut = int((firstWidth - TARGETWIDTH) / 2)
        img = img[0 : TARGETHEIGHT - 1, cut : cut + TARGETWIDTH]

    img = cv2.resize(img,(TARGETWIDTH, TARGETHEIGHT))

    cv2.imwrite(outputpath, img)
    print("Complete!")

if __name__ == '__main__':
    args = sys.argv
    resize(args[1], args[2])