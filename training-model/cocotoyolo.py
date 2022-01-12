from pycocotools.coco import COCO
import numpy as np
import tqdm
import argparse
import shutil
import os


def arg_parser():
    parser = argparse.ArgumentParser('code by rbj')
    parser.add_argument('--annotation_path', type=str,
                        default='data/annotations.json')
    parser.add_argument('--save_base_path', type=str, default='data/taco/labels/')
    args = parser.parse_args()
    return args


def create_dir(path):
    if os.path.exists(path) is False:
        os.makedirs(path)
    else:
        shutil.rmtree(path)
        os.makedirs(path)


if __name__ == '__main__':
    label_transfer = {5: 0}
    class_num = {}

    args = arg_parser()
    annotation_path = args.annotation_path
    save_base_path = args.save_base_path
    save_image_path = save_base_path.replace('labels', 'images')
    create_dir(save_base_path)
    create_dir(save_image_path)

    data_source = COCO(annotation_file=annotation_path)
    catIds = data_source.getCatIds()
    categories = data_source.loadCats(catIds)
    categories.sort(key=lambda x: x['id'])
    classes = {}
    coco_labels = {}
    coco_labels_inverse = {}
    for c in categories:
        coco_labels[len(classes)] = c['id']
        coco_labels_inverse[c['id']] = len(classes)
        classes[c['name']] = len(classes)
        
    img_ids = data_source.getImgIds()
    for index, img_id in tqdm.tqdm(enumerate(img_ids), desc='change .json file to .txt file'):
        img_info = data_source.loadImgs(img_id)[0]
        save_name = img_info['file_name'].replace('/', '_')
        file_name = save_name.split('.')[0]
        height = img_info['height']
        width = img_info['width']

        save_path = save_base_path + file_name + '.txt'
        is_exist = False
        with open(save_path, mode='w') as fp:
            annotation_id = data_source.getAnnIds(img_id)
            boxes = np.zeros((0, 5))
            if len(annotation_id) == 0:
                fp.write('')
                continue
            annotations = data_source.loadAnns(annotation_id)
            lines = ''
            for annotation in annotations:
                label = coco_labels_inverse[annotation['category_id']]
                if label in label_transfer.keys():
                    is_exist = True
                    box = annotation['bbox']
                    # some annotations have basically no width / height, skip them
                    if box[2] < 1 or box[3] < 1:
                        continue
                    # top_x,top_y,width,height---->cen_x,cen_y,width,height
                    box[0] = round((box[0] + box[2] / 2) / width, 6)
                    box[1] = round((box[1] + box[3] / 2) / height, 6)
                    box[2] = round(box[2] / width, 6)
                    box[3] = round(box[3] / height, 6)
                    label = label_transfer[label]
                    if label not in class_num.keys():
                        class_num[label] = 0
                    class_num[label] += 1
                    lines = lines + str(label)
                    for i in box:
                        lines += ' ' + str(i)
                    lines += '\n'
            fp.writelines(lines)
        if is_exist:
            shutil.copy('data/{}'.format(img_info['file_name']), os.path.join(save_image_path, save_name))
        else:
            os.remove(save_path)
    print(class_num)
    print('finish')