"""Synthetic-only tests for stage-5 MP4 extraction. NOT source film parity tests."""
import importlib.util
import pathlib
import tempfile
import unittest
import cv2
import numpy as np

MODULE=pathlib.Path(__file__).resolve().parents[1]/'tools'/'transcribe-hyper-hexagoner.py'
spec=importlib.util.spec_from_file_location('stage5_transcriber',MODULE)
transcribe=importlib.util.module_from_spec(spec)
spec.loader.exec_module(transcribe)


class TranscriberTests(unittest.TestCase):
    def setUp(self):
        self.accent=np.asarray([170,80,230],dtype=np.uint8)
        self.image=np.zeros((600,960,3),dtype=np.uint8)
        self.image[:]=(35,35,35)
        self.image[:,480:]=(50,50,50)

    def test_color_mask_geometry_and_hole(self):
        color=tuple(int(v) for v in self.accent)
        cv2.rectangle(self.image,(670,150),(780,235),color,-1)
        cv2.rectangle(self.image,(705,185),(738,206),(35,35,35),-1)
        mask=transcribe.accent_mask(self.image,self.accent)
        walls=transcribe.polygonize(mask)
        self.assertEqual(len(walls),1)
        self.assertEqual(len(walls[0]['holes']),1)
        self.assertGreater(min(p[0] for p in walls[0]['points']),100)
        self.assertTrue(all(len(w['points'])>=3 for w in walls))

    def test_track_ids_are_stable_not_duplicated(self):
        color=tuple(int(v) for v in self.accent)
        tracker=transcribe.TrackIds()
        ids=[]
        for x in [665,660,654,648]:
            frame=self.image.copy()
            cv2.rectangle(frame,(x,210),(x+75,245),color,-1)
            shapes=transcribe.polygonize(transcribe.accent_mask(frame,self.accent))
            tracked=tracker.assign(shapes)
            self.assertEqual(len(tracked),1)
            ids.append(tracked[0]['id'])
        self.assertEqual(len(set(ids)),1)
        self.assertEqual(tracker.serial,1)

    def test_center_ship_is_not_a_lethal_wall(self):
        color=tuple(int(v) for v in self.accent)
        cv2.circle(self.image,(480,300),53,color,5)
        mask=transcribe.accent_mask(self.image,self.accent)
        self.assertEqual(transcribe.polygonize(mask),[])

    def test_probe_real_decodable_synthetic_video(self):
        with tempfile.TemporaryDirectory() as path:
            movie=pathlib.Path(path)/'fixture.avi'
            writer=cv2.VideoWriter(str(movie),cv2.VideoWriter_fourcc(*'MJPG'),
                                   30,(320,200))
            if not writer.isOpened():
                self.skipTest('OpenCV FFmpeg MJPG video encoder unavailable')
            for i in range(120):
                frame=np.full((200,320,3),(i%128,40,80),dtype=np.uint8)
                writer.write(frame)
            writer.release()
            info=transcribe.probe(movie)
            self.assertEqual(info['resolution'],[320,200])
            self.assertAlmostEqual(info['duration'],4,places=1)
            frames=list(transcribe.source_frames(movie,1.,2.,60))
            self.assertEqual(len(frames),61)
            self.assertEqual(frames[0][0],0)
            self.assertEqual(frames[-1][0],60)


if __name__=='__main__':
    unittest.main()
